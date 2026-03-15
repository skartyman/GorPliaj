const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 8080),
  VENUE_CLOSING_TIME: process.env.VENUE_CLOSING_TIME || '23:59'
};
