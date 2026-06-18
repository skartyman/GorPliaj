const crypto = require('crypto');

function getSigningKey() {
  return process.env.ADMIN_AUTH_SECRET || 'ticket-signing-fallback-dev-key';
}

function generateTicketSignature(ticketCode, reservationDate) {
  const dateStr = new Date(reservationDate).toISOString().split('T')[0];
  const payload = `${ticketCode}|${dateStr}`;
  const hmac = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  return hmac.slice(0, 16);
}

function verifyTicketSignature(ticketCode, reservationDate, signature) {
  if (!ticketCode || !reservationDate || !signature) return false;
  const expected = generateTicketSignature(ticketCode, reservationDate);
  if (String(signature).length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function buildVerifyUrl(ticketCode, reservationDate) {
  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const sig = generateTicketSignature(ticketCode, reservationDate);
  return `${baseUrl}/api/admin/reservations/verify/${ticketCode}?t=${sig}`;
}

module.exports = {
  generateTicketSignature,
  verifyTicketSignature,
  buildVerifyUrl
};
