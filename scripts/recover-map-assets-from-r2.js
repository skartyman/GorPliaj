const crypto = require('crypto');
const path = require('path');
const { ListObjectsV2Command, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const { R2_CONFIG, isR2Configured } = require('../src/config/env');
const { MAP_ASSET_LIBRARY_KEY } = require('../src/services/r2StorageService');

const DEFAULT_SCAN_PREFIXES = ['map-objects/', 'menu/'];
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const TEXTURE_HINTS = [
  'texture',
  'surface',
  'floor',
  'sand',
  'wood',
  'grass',
  'tile',
  'water',
  'stone',
  'concrete',
  'pattern',
  'background',
  'bg',
  'пес',
  'дерев',
  'трава',
  'текстур'
];

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 10_000,
      requestTimeout: 30_000
    }),
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey
    }
  });
}

function buildPublicUrl(key) {
  return `${String(R2_CONFIG.publicBaseUrl || '').replace(/\/+$/u, '')}/${key}`;
}

function getStableId(prefix, key) {
  return `${prefix}-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)}`;
}

function getAssetName(key) {
  const parsed = path.posix.parse(key);
  const withoutTimestamp = parsed.name.replace(/^\d{10,}-[a-f0-9]{12,}-?/iu, '');
  const decoded = decodeURIComponent(withoutTimestamp || parsed.name);
  return decoded.replace(/[-_]+/gu, ' ').trim() || parsed.name || 'Asset';
}

function isImageKey(key) {
  const ext = path.posix.extname(key).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function isRecoverableKey(key) {
  if (!isImageKey(key)) return false;
  if (key === MAP_ASSET_LIBRARY_KEY) return false;
  if (key.includes('/map-backups/')) return false;
  return getScanPrefixes().some((prefix) => key.startsWith(prefix));
}

function looksLikeTexture(key) {
  const lower = key.toLowerCase();
  return TEXTURE_HINTS.some((hint) => lower.includes(hint));
}

function buildTextureAsset(key, createdAt) {
  const name = getAssetName(key);
  return {
    id: getStableId('recovered-texture', key),
    assetType: 'texture',
    name,
    url: buildPublicUrl(key),
    key,
    source: 'r2-recovery',
    createdAt,
    updatedAt: createdAt
  };
}

function buildObjectAsset(key, createdAt) {
  const ext = path.posix.extname(key).toLowerCase();
  const name = getAssetName(key);
  const url = buildPublicUrl(key);
  const asset = {
    id: getStableId('recovered-object', key),
    assetType: 'object',
    type: 'CUSTOM',
    name,
    label: name,
    width: ext === '.svg' ? 120 : 140,
    height: ext === '.svg' ? 88 : 100,
    zIndex: 1,
    interactionMode: 'DECOR',
    texture: '',
    textureUrl: ext === '.svg' ? '' : url,
    opacity: 1,
    strokeColor: '',
    strokeWidth: '',
    isLocked: false,
    key,
    source: 'r2-recovery',
    createdAt,
    updatedAt: createdAt
  };

  if (ext === '.svg') {
    asset.subType = 'SVG';
    asset.svgUrl = url;
  } else {
    asset.subType = 'IMAGE';
    asset.url = url;
  }

  return asset;
}

async function listKeys(client, prefix) {
  const objects = [];
  let ContinuationToken;
  let page = 0;

  console.log(`Scanning R2 prefix: ${prefix}`);

  do {
    page += 1;
    const result = await client.send(new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: prefix,
      ContinuationToken
    }));

    for (const item of result.Contents || []) {
      if (item.Key && isRecoverableKey(item.Key)) {
        objects.push(item);
      }
    }

    ContinuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    console.log(`Prefix ${prefix}: page ${page}, total recoverable images ${objects.length}.`);
  } while (ContinuationToken);

  return objects;
}

function getScanPrefixes() {
  const argPrefixes = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => String(arg || '').trim())
    .filter(Boolean)
    .map((arg) => (arg.endsWith('/') ? arg : `${arg}/`));

  return argPrefixes.length ? argPrefixes : DEFAULT_SCAN_PREFIXES;
}

async function main() {
  if (!isR2Configured) {
    throw new Error('R2 is not configured. Missing one of R2_* env vars.');
  }

  const client = getClient();
  const scanPrefixes = getScanPrefixes();
  console.log(`R2 recovery started. Prefixes: ${scanPrefixes.join(', ')}`);
  const listed = [];

  for (const prefix of scanPrefixes) {
    listed.push(...await listKeys(client, prefix));
  }

  const byKey = new Map(listed.map((item) => [item.Key, item]));
  const now = new Date().toISOString();
  const assets = [];

  for (const item of [...byKey.values()].sort((a, b) => String(a.Key).localeCompare(String(b.Key)))) {
    const key = item.Key;
    const createdAt = item.LastModified ? item.LastModified.toISOString() : now;
    const ext = path.posix.extname(key).toLowerCase();

    if (ext === '.svg') {
      assets.push(buildObjectAsset(key, createdAt));
      continue;
    }

    assets.push(buildTextureAsset(key, createdAt));

    if (!looksLikeTexture(key)) {
      assets.push(buildObjectAsset(key, createdAt));
    }
  }

  const library = {
    version: 1,
    updatedAt: now,
    recoveredAt: now,
    assets
  };

  await client.send(new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: MAP_ASSET_LIBRARY_KEY,
    Body: JSON.stringify(library, null, 2),
    ContentType: 'application/json',
    CacheControl: 'no-store'
  }));

  const textureCount = assets.filter((asset) => asset.assetType === 'texture').length;
  const objectCount = assets.filter((asset) => asset.assetType === 'object').length;
  console.log(`Recovered ${assets.length} map assets from ${byKey.size} R2 images.`);
  console.log(`Textures: ${textureCount}. Objects: ${objectCount}. Manifest: ${MAP_ASSET_LIBRARY_KEY}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
