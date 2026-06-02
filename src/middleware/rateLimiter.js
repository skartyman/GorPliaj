const requestLog = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }

  const timestamps = requestLog.get(ip);
  const windowStart = now - WINDOW_MS;

  while (timestamps.length > 0 && timestamps[0] < windowStart) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    return res.status(429).json({
      message: 'Too many attempts. Please try again later.',
      retryAfter
    });
  }

  timestamps.push(now);
  next();
}

module.exports = { rateLimiter };
