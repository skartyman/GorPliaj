const crypto = require('crypto');

function generateTicketCode() {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `GP-${random}`;
}

function isValidTicketCode(code) {
  return typeof code === 'string' && /^GP-[A-F0-9]{8}$/i.test(code.toUpperCase());
}

module.exports = { generateTicketCode, isValidTicketCode };
