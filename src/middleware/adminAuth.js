const { verifyToken } = require('../services/adminAuthService');

const ADMIN_AUTH_COOKIE_NAME = 'admin_auth_token';

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex <= 0) {
        return acc;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function extractToken(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  if (cookies[ADMIN_AUTH_COOKIE_NAME]) {
    return cookies[ADMIN_AUTH_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

function requireAdminAuth(req, res, next) {
  const token = extractToken(req);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Unauthorized admin access.' });
  }

  req.adminAuth = payload;
  return next();
}

module.exports = {
  requireAdminAuth,
  extractToken,
  ADMIN_AUTH_COOKIE_NAME
};
