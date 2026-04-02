const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

function getOptionalEnv(name, fallbackValue) {
  const rawValue = process.env[name];
  if (typeof rawValue !== 'string') {
    return fallbackValue;
  }

  const trimmedValue = rawValue.trim();
  return trimmedValue || fallbackValue;
}

function getRequiredEnv(name) {
  const value = getOptionalEnv(name, '');
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}

function getBooleanEnv(name, fallbackValue = false) {
  const value = getOptionalEnv(name, fallbackValue ? 'true' : 'false').toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(value);
}

const NODE_ENV = getOptionalEnv('NODE_ENV', 'development');
const isLocalDevelopment = NODE_ENV === 'development';

const R2_CONFIG = {
  accountId: getOptionalEnv('R2_ACCOUNT_ID', ''),
  accessKeyId: getOptionalEnv('R2_ACCESS_KEY_ID', ''),
  secretAccessKey: getOptionalEnv('R2_SECRET_ACCESS_KEY', ''),
  bucketName: getOptionalEnv('R2_BUCKET_NAME', ''),
  publicBaseUrl: getOptionalEnv('R2_PUBLIC_BASE_URL', ''),
  endpoint: getOptionalEnv('R2_ENDPOINT', '')
};

const isR2Configured = Object.values(R2_CONFIG).every((value) => Boolean(value));

if (NODE_ENV === 'production' && !isR2Configured) {
  throw new Error(
    'R2 image uploads are enabled in production, but one or more required env vars are missing: '
    + 'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL, R2_ENDPOINT.'
  );
}

module.exports = {
  NODE_ENV,
  PORT: Number(getOptionalEnv('PORT', 8080)),
  DATABASE_URL: getOptionalEnv('DATABASE_URL', ''),
  ADMIN_AUTH_SECRET: getOptionalEnv('ADMIN_AUTH_SECRET', ''),
  APP_BASE_URL: getOptionalEnv('APP_BASE_URL', 'http://localhost:8080'),
  VENUE_CLOSING_TIME: getOptionalEnv('VENUE_CLOSING_TIME', '23:59'),
  R2_CONFIG,
  isR2Configured,
  isLocalDevelopment,
  getRequiredEnv,
  ENABLE_TELEGRAM_MINIAPP: getBooleanEnv('ENABLE_TELEGRAM_MINIAPP', false),
  TELEGRAM_MINIAPP_UPLOADS_ROOT: getOptionalEnv('TELEGRAM_MINIAPP_UPLOADS_ROOT', 'miniapp-telegram/uploads'),
  TELEGRAM_MINIAPP_STATUS_WEBHOOK_URL: getOptionalEnv('TELEGRAM_MINIAPP_STATUS_WEBHOOK_URL', '')
};
