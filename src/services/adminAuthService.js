const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN_AUTH_SECRET = process.env.ADMIN_AUTH_SECRET || 'gorpliaj-admin-secret';
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
    .createHmac('sha256', ADMIN_AUTH_SECRET)
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

  if (!signature || signature !== expectedSignature) {
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

module.exports = {
  loginAdmin,
  verifyToken,
  getAdminById,
  getTokenTtlMs
};
