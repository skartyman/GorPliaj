const { verifyWaiterToken } = require('../services/waiterService');

const WAITER_AUTH_COOKIE_NAME = 'waiter_auth_token';

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  return cookieHeader.split(';').map(p => p.trim()).filter(Boolean).reduce((acc, part) => {
    const i = part.indexOf('=');
    if (i <= 0) return acc;
    acc[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return acc;
  }, {});
}

function extractWaiterToken(req) {
  if (req.query?.token && typeof req.query.token === 'string') return req.query.token;
  const cookies = parseCookieHeader(req.headers.cookie);
  if (cookies[WAITER_AUTH_COOKIE_NAME]) return cookies[WAITER_AUTH_COOKIE_NAME];
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

function requireWaiterAuth(req, res, next) {
  const token = extractWaiterToken(req);
  const payload = verifyWaiterToken(token);
  if (!payload) return res.status(401).json({ message: 'Unauthorized waiter access.' });
  req.waiterAuth = payload;
  next();
}

module.exports = { requireWaiterAuth, WAITER_AUTH_COOKIE_NAME };
