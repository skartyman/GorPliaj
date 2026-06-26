const crypto = require('crypto');

function getSigningKey() {
  return process.env.ADMIN_AUTH_SECRET || 'ticket-signing-fallback-dev-key';
}

function generateSaleTicketSignature(ticketCode) {
  const payload = `sale-ticket|${String(ticketCode || '').trim().toUpperCase()}`;
  const hmac = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  return hmac.slice(0, 20);
}

function generateTicketSignature(ticketCode, reservationDate) {
  const dateStr = new Date(reservationDate).toISOString().split('T')[0];
  const payload = `${ticketCode}|${dateStr}`;
  const hmac = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  return hmac.slice(0, 16);
}

function verifySaleTicketSignature(ticketCode, signature) {
  if (!ticketCode || !signature) return false;
  const expected = generateSaleTicketSignature(ticketCode);
  if (String(signature).length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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
  return `${baseUrl}/admin/verify-ticket?ticket=${encodeURIComponent(ticketCode)}&t=${sig}`;
}

function buildSaleTicketVerifyUrl(ticketCode) {
  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const sig = generateSaleTicketSignature(ticketCode);
  return `${baseUrl}/admin/verify-ticket?ticket=${encodeURIComponent(ticketCode)}&t=${sig}`;
}

function buildReservationStatusUrl(ticketCode, reservationDate) {
  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const sig = generateTicketSignature(ticketCode, reservationDate);
  return `${baseUrl}/api/reservations/${encodeURIComponent(ticketCode)}/status?t=${sig}`;
}

function buildReservationPdfUrl(ticketCode, reservationDate) {
  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const sig = generateTicketSignature(ticketCode, reservationDate);
  return `${baseUrl}/api/reservations/${encodeURIComponent(ticketCode)}/pdf?t=${sig}`;
}

function buildDepositVerifyUrl(ticketCode, reservationDate) {
  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const sig = generateTicketSignature(ticketCode, reservationDate);
  return `${baseUrl}/admin/verify-ticket?ticket=${encodeURIComponent(ticketCode)}&t=${sig}&view=deposit`;
}

module.exports = {
  generateSaleTicketSignature,
  generateTicketSignature,
  verifySaleTicketSignature,
  verifyTicketSignature,
  buildSaleTicketVerifyUrl,
  buildVerifyUrl,
  buildReservationStatusUrl,
  buildReservationPdfUrl,
  buildDepositVerifyUrl
};
