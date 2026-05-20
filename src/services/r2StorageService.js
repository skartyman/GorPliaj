const crypto = require('crypto');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { R2_CONFIG, isR2Configured } = require('../config/env');

const ALLOWED_UPLOAD_FOLDERS = new Set(['events', 'news', 'menu', 'map-objects']);
const SUPPORTED_MIME_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/svg+xml', 'svg']
]);

let cachedClient = null;

function getS3Client() {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey
    }
  });

  return cachedClient;
}

function isMimeTypeAllowed(mimeType) {
  return SUPPORTED_MIME_TYPES.has(String(mimeType || '').toLowerCase());
}

function normalizeFolder(folder) {
  const normalized = String(folder || '').trim().toLowerCase();
  return ALLOWED_UPLOAD_FOLDERS.has(normalized) ? normalized : null;
}

function buildStorageKey({ folder, originalName, mimeType }) {
  const extFromMimeType = SUPPORTED_MIME_TYPES.get(String(mimeType || '').toLowerCase());
  const originalExt = path.extname(String(originalName || '')).toLowerCase().replace('.', '');

  const extension = extFromMimeType || originalExt || 'bin';
  const timestamp = Date.now();
  const randomPart = crypto.randomBytes(12).toString('hex');

  return `${folder}/${timestamp}-${randomPart}.${extension}`;
}

function buildPublicUrl(key) {
  const base = String(R2_CONFIG.publicBaseUrl || '').trim().replace(/\/+$/u, '');
  return `${base}/${key}`;
}

async function uploadImage({ folder, file }) {
  if (!isR2Configured) {
    return {
      type: 'NOT_CONFIGURED',
      message: 'Image upload storage is not configured.'
    };
  }

  const normalizedFolder = normalizeFolder(folder);
  if (!normalizedFolder) {
    return {
      type: 'INVALID_FOLDER',
      message: 'Upload folder is invalid.'
    };
  }

  if (!file || !file.buffer || !isMimeTypeAllowed(file.mimetype)) {
    return {
      type: 'INVALID_FILE',
      message: 'Uploaded file is invalid or unsupported.'
    };
  }

  const key = buildStorageKey({
    folder: normalizedFolder,
    originalName: file.originalname,
    mimeType: file.mimetype
  });

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable'
  });

  await getS3Client().send(command);

  return {
    type: 'SUCCESS',
    key,
    url: buildPublicUrl(key)
  };
}

module.exports = {
  ALLOWED_UPLOAD_FOLDERS,
  SUPPORTED_MIME_TYPES,
  isMimeTypeAllowed,
  uploadImage
};
