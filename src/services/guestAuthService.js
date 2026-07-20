const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { ADMIN_AUTH_SECRET, isLocalDevelopment } = require('../config/env');

const effectiveSecret = ADMIN_AUTH_SECRET || (() => {
  if (!isLocalDevelopment) {
    throw new Error('ADMIN_AUTH_SECRET environment variable is required for guest authentication.');
  }
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('ADMIN_AUTH_SECRET not set. Generated temporary key for development:', generated);
  return generated;
})();

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAGIC_LINK_TTL_MS = 1000 * 60 * 15;

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(tokenPart) {
  try {
    const value = Buffer.from(tokenPart, 'base64url').toString('utf8');
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function signTokenPart(tokenPart) {
  return crypto
    .createHmac('sha256', effectiveSecret)
    .update(tokenPart)
    .digest('base64url');
}

function generateToken(guest) {
  const payload = {
    sub: guest.id,
    email: guest.email,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const tokenPart = encodePayload(payload);
  const signature = signTokenPart(tokenPart);
  return `${tokenPart}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
  const [tokenPart, signature] = token.split('.');
  const expectedSignature = signTokenPart(tokenPart);
  if (!signature || signature.length !== expectedSignature.length) {
    return null;
  }
  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
  if (!isValidSignature) {
    return null;
  }
  const payload = decodePayload(tokenPart);
  if (!payload || !payload.sub || !payload.exp || Date.now() > payload.exp) {
    return null;
  }
  return payload;
}

async function getGuestById(guestId) {
  return prisma.guest.findUnique({
    where: { id: guestId },
    select: { id: true, email: true, phone: true, name: true, shellBalance: true, createdAt: true, lastLoginAt: true }
  });
}

async function findOrCreateGuest({ email, phone, name }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await prisma.guest.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const updates = {};
    if (phone && !existing.phone) updates.phone = phone;
    if (name && !existing.name) updates.name = name;
    if (Object.keys(updates).length) {
      return prisma.guest.update({ where: { id: existing.id }, data: updates });
    }
    return existing;
  }
  return prisma.guest.create({
    data: { email: normalizedEmail, phone: phone || null, name: name || null }
  });
}

async function findGuestByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  return prisma.guest.findUnique({ where: { email: normalizedEmail } });
}

async function createMagicLink(guestId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
  await prisma.guestMagicLink.deleteMany({ where: { guestId, usedAt: null } });
  const link = await prisma.guestMagicLink.create({
    data: { guestId, token, expiresAt }
  });
  return link;
}

async function verifyMagicLink(token) {
  const link = await prisma.guestMagicLink.findUnique({
    where: { token },
    include: { guest: true }
  });
  if (!link) return null;
  if (link.usedAt) return null;
  if (Date.now() > new Date(link.expiresAt).getTime()) return null;
  const claimed = await prisma.guestMagicLink.updateMany({
    where: { id: link.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() }
  });
  if (claimed.count !== 1) return null;
  await prisma.guest.update({
    where: { id: link.guestId },
    data: { lastLoginAt: new Date() }
  });

  const shellService = require('./shellService');
  await shellService.grantRegistrationBonus(link.guestId);

  const refreshedGuest = await prisma.guest.findUnique({ where: { id: link.guestId } });

  return refreshedGuest;
}

module.exports = {
  generateToken,
  verifyToken,
  getGuestById,
  findOrCreateGuest,
  findGuestByEmail,
  createMagicLink,
  verifyMagicLink,
  getTokenTtlMs: () => TOKEN_TTL_MS
};
