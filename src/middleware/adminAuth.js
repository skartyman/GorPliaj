const { verifyToken } = require('../services/adminAuthService');

function extractToken(req) {
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
  extractToken
};
