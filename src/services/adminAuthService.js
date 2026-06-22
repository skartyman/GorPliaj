const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { ADMIN_AUTH_SECRET, isLocalDevelopment } = require('../config/env');

const effectiveSecret = ADMIN_AUTH_SECRET || (() => {
  if (!isLocalDevelopment) {
    throw new Error('ADMIN_AUTH_SECRET environment variable is required for admin authentication.');
  }

  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('ADMIN_AUTH_SECRET not set. Generated temporary key for development:', generated);
  return generated;
})();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

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

function getTokenTtlMs() {
  return TOKEN_TTL_MS;
}

function generateToken(adminUser) {
  const payload = {
    sub: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
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

async function loginAdmin({ email, password }) {
  const adminUser = await prisma.adminUser.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true
    }
  });

  if (!adminUser) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, adminUser.password);
  if (!isPasswordValid) {
    return null;
  }

  const token = generateToken(adminUser);

  return {
    token,
    admin: {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    }
  };
}

async function getAdminById(adminId) {
  return prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      role: true
    }
  });
}

async function changeAdminPassword({ adminId, currentPassword, nextPassword }) {
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      password: true
    }
  });

  if (!adminUser) {
    return { type: 'NOT_FOUND' };
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminUser.password);
  if (!isCurrentPasswordValid) {
    return { type: 'INVALID_CURRENT_PASSWORD' };
  }

  const hashedPassword = await bcrypt.hash(nextPassword, 10);
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { password: hashedPassword }
  });

  return { type: 'SUCCESS' };
}

module.exports = {
  loginAdmin,
  verifyToken,
  getAdminById,
  changeAdminPassword,
  getTokenTtlMs
};
