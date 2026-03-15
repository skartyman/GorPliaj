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

module.exports = {
  NODE_ENV,
  PORT: Number(getOptionalEnv('PORT', 8080)),
  DATABASE_URL: getOptionalEnv('DATABASE_URL', ''),
  ADMIN_AUTH_SECRET: getOptionalEnv('ADMIN_AUTH_SECRET', ''),
  APP_BASE_URL: getOptionalEnv('APP_BASE_URL', 'http://localhost:8080'),
  VENUE_CLOSING_TIME: getOptionalEnv('VENUE_CLOSING_TIME', '23:59'),
  isLocalDevelopment,
  getRequiredEnv
};
