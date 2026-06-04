const crypto = require('crypto');
const path = require('path');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { R2_CONFIG, isR2Configured } = require('../config/env');

const ALLOWED_UPLOAD_FOLDERS = new Set(['events', 'news', 'menu', 'map-objects']);
const MAP_ASSET_LIBRARY_KEY = 'map-objects/_asset-library.json';
const MAP_ASSET_TYPES = new Set(['texture', 'object']);
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

async function streamToString(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function emptyMapAssetLibrary() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    assets: []
  };
}

function normalizeMapAssetType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return MAP_ASSET_TYPES.has(normalized) ? normalized : null;
}

function normalizeMapAsset(asset) {
  if (!asset || typeof asset !== 'object') {
    return null;
  }

  const assetType = normalizeMapAssetType(asset.assetType || asset.kind);
  const url = String(asset.url || '').trim();
  const key = String(asset.key || '').trim();
  const name = String(asset.name || asset.label || '').trim();

  if (!assetType) {
    return null;
  }

  if (assetType === 'texture' && !url) {
    return null;
  }

  if (
    assetType === 'object' &&
    !url &&
    !asset.svgUrl &&
    !asset.svgCode &&
    !asset.textureUrl &&
    !asset.subType
  ) {
    return null;
  }

  const id = String(asset.id || `${assetType}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`).trim();
  const normalized = {
    ...asset,
    id,
    assetType,
    name: name || (assetType === 'texture' ? 'Texture' : 'Object'),
    url,
    key,
    createdAt: asset.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return normalized;
}

async function readJsonObject(key, fallback) {
  if (!isR2Configured) {
    return fallback;
  }

  try {
    const result = await getS3Client().send(new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key
    }));

    const raw = await streamToString(result.Body);
    return JSON.parse(raw);
  } catch (error) {
    if (['NoSuchKey', 'NotFound'].includes(error?.name) || error?.$metadata?.httpStatusCode === 404) {
      return fallback;
    }

    throw error;
  }
}

async function putJsonObject(key, value) {
  if (!isR2Configured) {
    return {
      type: 'NOT_CONFIGURED',
      message: 'Image upload storage is not configured.'
    };
  }

  await getS3Client().send(new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: JSON.stringify(value, null, 2),
    ContentType: 'application/json',
    CacheControl: 'no-store'
  }));

  return {
    type: 'SUCCESS',
    key,
    url: buildPublicUrl(key)
  };
}

async function getMapAssetLibrary() {
  const library = await readJsonObject(MAP_ASSET_LIBRARY_KEY, emptyMapAssetLibrary());
  const assets = Array.isArray(library.assets)
    ? library.assets.map(normalizeMapAsset).filter(Boolean)
    : [];

  return {
    version: 1,
    updatedAt: library.updatedAt || new Date().toISOString(),
    assets
  };
}

async function saveMapAsset(asset) {
  if (!isR2Configured) {
    return {
      type: 'NOT_CONFIGURED',
      message: 'Image upload storage is not configured.'
    };
  }

  const normalized = normalizeMapAsset(asset);
  if (!normalized) {
    return {
      type: 'INVALID_ASSET',
      message: 'Map asset payload is invalid.'
    };
  }

  const library = await getMapAssetLibrary();
  const nextLibrary = {
    ...library,
    updatedAt: new Date().toISOString(),
    assets: [
      normalized,
      ...library.assets.filter((item) => item.id !== normalized.id && item.url !== normalized.url)
    ].slice(0, 300)
  };

  await putJsonObject(MAP_ASSET_LIBRARY_KEY, nextLibrary);

  return {
    type: 'SUCCESS',
    asset: normalized,
    library: nextLibrary
  };
}

async function deleteObjectByKey(key) {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey || !isR2Configured) {
    return;
  }

  await getS3Client().send(new DeleteObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: normalizedKey
  }));
}

async function deleteMapAsset(assetId) {
  if (!isR2Configured) {
    return {
      type: 'NOT_CONFIGURED',
      message: 'Image upload storage is not configured.'
    };
  }

  const id = String(assetId || '').trim();
  const library = await getMapAssetLibrary();
  const asset = library.assets.find((item) => item.id === id);
  if (!asset) {
    return {
      type: 'NOT_FOUND',
      message: 'Map asset not found.'
    };
  }

  const nextLibrary = {
    ...library,
    updatedAt: new Date().toISOString(),
    assets: library.assets.filter((item) => item.id !== id)
  };

  await putJsonObject(MAP_ASSET_LIBRARY_KEY, nextLibrary);
  await deleteObjectByKey(asset.key);

  return {
    type: 'SUCCESS',
    asset,
    library: nextLibrary
  };
}

async function saveMapSnapshot(mapId, payload) {
  if (!isR2Configured || !mapId || !payload) {
    return null;
  }

  const now = new Date();
  const safeMapId = String(mapId).replace(/[^a-z0-9_-]/giu, '-');
  const timestamp = now.toISOString().replace(/[:.]/gu, '-');
  const snapshot = {
    version: 1,
    mapId,
    savedAt: now.toISOString(),
    payload
  };

  await putJsonObject(`map-objects/map-backups/map-${safeMapId}-latest.json`, snapshot);
  return putJsonObject(`map-objects/map-backups/map-${safeMapId}-${timestamp}.json`, snapshot);
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
  MAP_ASSET_LIBRARY_KEY,
  SUPPORTED_MIME_TYPES,
  deleteMapAsset,
  getMapAssetLibrary,
  isMimeTypeAllowed,
  saveMapSnapshot,
  saveMapAsset,
  uploadImage
};
