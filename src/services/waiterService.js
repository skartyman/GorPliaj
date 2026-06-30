const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { ADMIN_AUTH_SECRET, isLocalDevelopment } = require('../config/env');

const effectiveSecret = ADMIN_AUTH_SECRET || (() => {
  if (!isLocalDevelopment) {
    throw new Error('ADMIN_AUTH_SECRET environment variable is required for waiter authentication.');
  }
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('ADMIN_AUTH_SECRET not set. Generated temporary key for waiter auth:', generated);
  return generated;
})();

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(tokenPart) {
  try {
    return JSON.parse(Buffer.from(tokenPart, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function signTokenPart(tokenPart) {
  return crypto.createHmac('sha256', effectiveSecret).update(tokenPart).digest('base64url');
}

function generateWaiterToken(waiter) {
  const payload = {
    sub: waiter.id,
    name: waiter.name,
    type: 'waiter',
    exp: Date.now() + TOKEN_TTL_MS
  };
  const tokenPart = encodePayload(payload);
  const signature = signTokenPart(tokenPart);
  return `${tokenPart}.${signature}`;
}

function verifyWaiterToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [tokenPart, signature] = token.split('.');
  const expected = signTokenPart(tokenPart);
  if (!signature || signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))) return null;
  const payload = decodePayload(tokenPart);
  if (!payload || !payload.sub || payload.type !== 'waiter' || !payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

async function loginByPin(pinCode) {
  const waiter = await prisma.waiter.findUnique({
    where: { pinCode },
    select: { id: true, name: true, isActive: true }
  });
  if (!waiter || !waiter.isActive) return null;
  const token = generateWaiterToken(waiter);
  return { token, waiter: { id: waiter.id, name: waiter.name } };
}

async function getWaiterById(id) {
  return prisma.waiter.findUnique({
    where: { id },
    select: { id: true, name: true, telegramChatId: true, isActive: true, createdAt: true }
  });
}

async function listWaiters() {
  return prisma.waiter.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true, pinCode: true, telegramChatId: true, isActive: true, createdAt: true }
  });
}

async function createWaiter({ name, pinCode, telegramChatId }) {
  return prisma.waiter.create({
    data: { name, pinCode, telegramChatId: telegramChatId || null },
    select: { id: true, name: true, pinCode: true, telegramChatId: true, isActive: true, createdAt: true }
  });
}

async function updateWaiter(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.pinCode !== undefined) updateData.pinCode = data.pinCode;
  if (data.telegramChatId !== undefined) updateData.telegramChatId = data.telegramChatId || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  return prisma.waiter.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, pinCode: true, telegramChatId: true, isActive: true }
  });
}

async function deleteWaiter(id) {
  await prisma.waiter.delete({ where: { id } });
}

async function startShift(waiterId) {
  const activeShift = await prisma.waiterShift.findFirst({
    where: { waiterId, isActive: true }
  });
  if (activeShift) return activeShift;

  return prisma.waiterShift.create({
    data: { waiterId },
    select: { id: true, waiterId: true, startedAt: true, isActive: true }
  });
}

async function endShift(shiftId) {
  return prisma.waiterShift.update({
    where: { id: shiftId },
    data: { isActive: true, endedAt: new Date() },
    select: { id: true, waiterId: true, startedAt: true, endedAt: true, isActive: true }
  });
}

async function getActiveShift(waiterId) {
  return prisma.waiterShift.findFirst({
    where: { waiterId, isActive: true },
    include: {
      tables: {
        select: { id: true, tableId: true, assignedAt: true }
      }
    }
  });
}

async function assignTableToShift(shiftId, tableId) {
  const existing = await prisma.waiterShiftTable.findUnique({
    where: { shiftId_tableId: { shiftId, tableId } }
  });
  if (existing) return existing;

  return prisma.waiterShiftTable.create({
    data: { shiftId, tableId },
    select: { id: true, tableId: true, assignedAt: true }
  });
}

async function removeTableFromShift(shiftId, tableId) {
  await prisma.waiterShiftTable.deleteMany({ where: { shiftId, tableId } });
}

async function getWaiterForTable(tableId) {
  const assignment = await prisma.waiterShiftTable.findFirst({
    where: { tableId, shift: { isActive: true } },
    include: {
      shift: {
        select: { waiterId: true, waiter: { select: { id: true, name: true, telegramChatId: true } } }
      }
    }
  });
  return assignment?.shift?.waiter || null;
}

async function getTableByCode(code) {
  return prisma.venueTable.findFirst({
    where: { code, isActive: true },
    select: { id: true, code: true, name: true, zoneId: true, mapId: true }
  });
}

async function assignTableByCode(shiftId, code) {
  const table = await getTableByCode(code);
  if (!table) return { type: 'NOT_FOUND' };

  const existing = await prisma.waiterShiftTable.findUnique({
    where: { shiftId_tableId: { shiftId, tableId: table.id } }
  });
  if (existing) return { type: 'ALREADY_ASSIGNED', table, assignment: existing };

  const assignment = await prisma.waiterShiftTable.create({
    data: { shiftId, tableId: table.id },
    select: { id: true, tableId: true, assignedAt: true }
  });
  return { type: 'SUCCESS', table, assignment };
}

module.exports = {
  verifyWaiterToken,
  loginByPin,
  getWaiterById,
  listWaiters,
  createWaiter,
  updateWaiter,
  deleteWaiter,
  startShift,
  endShift,
  getActiveShift,
  assignTableToShift,
  assignTableByCode,
  removeTableFromShift,
  getWaiterForTable,
  getTableByCode
};
