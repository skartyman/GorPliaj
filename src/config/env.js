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
  console.warn(
    'R2 image uploads are disabled in production because one or more env vars are missing: '
    + 'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL, R2_ENDPOINT.'
  );
}

module.exports = {
  NODE_ENV,
  PORT: Number(getOptionalEnv('PORT', 8080)),
  DATABASE_URL: getOptionalEnv('DATABASE_URL', ''),
  ADMIN_AUTH_SECRET: getOptionalEnv('ADMIN_AUTH_SECRET', ''),
  GROQ_API_KEY: getOptionalEnv('GROQ_API_KEY', ''),
  APP_BASE_URL: getOptionalEnv('APP_BASE_URL', 'http://localhost:8080'),
  VENUE_CLOSING_TIME: getOptionalEnv('VENUE_CLOSING_TIME', '23:59'),
  INVOICE_BOT_TOKEN: getOptionalEnv('INVOICE_BOT_TOKEN', ''),
  GOOGLE_SHEETS_PRIVATE_KEY: getOptionalEnv('GOOGLE_SHEETS_PRIVATE_KEY', ''),
  GOOGLE_SHEETS_CLIENT_EMAIL: getOptionalEnv('GOOGLE_SHEETS_CLIENT_EMAIL', ''),
  GOOGLE_SHEETS_SPREADSHEET_ID: getOptionalEnv('GOOGLE_SHEETS_SPREADSHEET_ID', ''),
  R2_CONFIG,
  isR2Configured,
  isLocalDevelopment,
  POSTHOG_PROJECT_API_KEY: getOptionalEnv('POSTHOG_PROJECT_API_KEY', ''),
  POSTHOG_HOST: getOptionalEnv('POSTHOG_HOST', 'https://eu.i.posthog.com'),
  getOptionalEnv,
  getRequiredEnv
};
