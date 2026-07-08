const fs = require('fs/promises');
const path = require('path');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { R2_CONFIG, isR2Configured } = require('../src/config/env');

const SOURCE_PATH = path.resolve(__dirname, '..', 'public-frontend', 'public', 'videos', 'sea-loop.mp4');
const TARGET_KEY = 'videos/sea-loop.mp4';

async function main() {
  if (!isR2Configured) {
    throw new Error('R2 is not configured. Missing one of R2_* env vars.');
  }

  const body = await fs.readFile(SOURCE_PATH);
  const client = new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey
    }
  });

  await client.send(new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: TARGET_KEY,
    Body: body,
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=31536000, immutable'
  }));

  const baseUrl = String(R2_CONFIG.publicBaseUrl || '').replace(/\/+$/u, '');
  console.log(`${baseUrl}/${TARGET_KEY}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
