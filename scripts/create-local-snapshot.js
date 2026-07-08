const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

function parseArgs(argv) {
  const args = { envFile: '', outputDir: '', writeEnv: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--env-file') args.envFile = argv[++i] || '';
    else if (arg === '--output-dir') args.outputDir = argv[++i] || '';
    else if (arg === '--write-env') args.writeEnv = true;
  }
  return args;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeEnv(envObject) {
  const entries = Object.entries(envObject)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
}

function toSerializable(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toSerializable);
  if (typeof value === 'object') {
    if (typeof value.toJSON === 'function') {
      return value.toJSON();
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, toSerializable(nestedValue)])
    );
  }
  return value;
}

function toDelegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function streamToFile(stream, targetPath) {
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(targetPath);
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
  });
}

async function exportDatabase(snapshotDir) {
  const { PrismaClient, Prisma } = require('@prisma/client');
  const prisma = new PrismaClient();
  const dbDir = path.join(snapshotDir, 'database');
  ensureDir(dbDir);

  const summary = {};

  try {
    for (const model of Prisma.dmmf.datamodel.models) {
      const delegateName = toDelegateName(model.name);
      const delegate = prisma[delegateName];
      if (!delegate || typeof delegate.findMany !== 'function') continue;

      const idField = model.fields.find((field) => field.name === 'id');
      const orderBy = idField ? { id: 'asc' } : undefined;
      const rows = await delegate.findMany(orderBy ? { orderBy } : {});
      const serialized = rows.map(toSerializable);
      const filePath = path.join(dbDir, `${model.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2));
      summary[model.name] = { count: serialized.length, file: path.relative(snapshotDir, filePath) };
      console.log(`Database: exported ${model.name} (${serialized.length})`);
    }
  } finally {
    await prisma.$disconnect();
  }

  return summary;
}

function getR2Config() {
  const config = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    endpoint: process.env.R2_ENDPOINT || '',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || '',
    accountId: process.env.R2_ACCOUNT_ID || ''
  };
  const isConfigured = Object.values(config).every(Boolean);
  return { config, isConfigured };
}

async function exportR2(snapshotDir) {
  const { config, isConfigured } = getR2Config();
  const r2Dir = path.join(snapshotDir, 'r2');
  ensureDir(r2Dir);

  if (!isConfigured) {
    console.log('R2: skipped because config is incomplete.');
    return { enabled: false, count: 0, bytes: 0 };
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  let token = undefined;
  let count = 0;
  let totalBytes = 0;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.bucketName,
      ContinuationToken: token
    }));

    for (const item of response.Contents || []) {
      if (!item.Key) continue;
      if (item.Key.endsWith('/')) continue;
      const targetPath = path.join(r2Dir, item.Key.replace(/\//g, path.sep));
      ensureDir(path.dirname(targetPath));
      const object = await client.send(new GetObjectCommand({
        Bucket: config.bucketName,
        Key: item.Key
      }));
      await streamToFile(object.Body, targetPath);
      count += 1;
      totalBytes += Number(item.Size || 0);
      console.log(`R2: downloaded ${item.Key}`);
    }

    token = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (token);

  return {
    enabled: true,
    count,
    bytes: totalBytes,
    bucket: config.bucketName,
    endpoint: config.endpoint,
    publicBaseUrl: config.publicBaseUrl
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.envFile) {
    dotenv.config({ path: path.resolve(process.cwd(), args.envFile), override: true });
  } else {
    dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });
  }

  const outputDir = args.outputDir
    ? path.resolve(process.cwd(), args.outputDir)
    : path.resolve(process.cwd(), 'snapshots', `live-${timestamp()}`);
  ensureDir(outputDir);

  const schemaSource = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
  const schemaTarget = path.join(outputDir, 'schema.prisma');
  fs.copyFileSync(schemaSource, schemaTarget);

  if (args.writeEnv) {
    const envTarget = path.join(outputDir, 'env.live');
    fs.writeFileSync(envTarget, sanitizeEnv(process.env));
  }

  const database = await exportDatabase(outputDir);
  const r2 = await exportR2(outputDir);

  const manifest = {
    createdAt: new Date().toISOString(),
    outputDir,
    database,
    r2
  };

  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Snapshot ready: ${outputDir}`);
}

main().catch((error) => {
  console.error('Snapshot failed:', error);
  process.exit(1);
});
