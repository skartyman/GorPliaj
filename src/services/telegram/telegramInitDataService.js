const crypto = require('crypto');

function validateTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash || !botToken) {
    return { ok: false, reason: 'Missing hash or bot token.' };
  }

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    return { ok: false, reason: 'Hash mismatch.' };
  }

  const userRaw = params.get('user');
  let user = null;

  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }

  return { ok: true, user };
}

module.exports = { validateTelegramInitData };
