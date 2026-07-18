const guestAuthService = require('../services/guestAuthService');

function requireGuestAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? guestAuthService.verifyToken(token) : null;
  if (!payload || !payload.sub) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  req.guestId = payload.sub;
  req.guestEmail = payload.email;
  next();
}

module.exports = { requireGuestAuth };
