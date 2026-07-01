const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { broadcastToWaiter } = require('./waiterSseService');
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
const TELEGRAM_LINK_TTL_MS = 1000 * 60 * 10;

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

function signTelegramLink(waiterId, exp) {
  return crypto
    .createHmac('sha256', effectiveSecret)
    .update(`${waiterId}.${exp}`)
    .digest('base64url')
    .slice(0, 22);
}

function createTelegramLinkToken(waiterId) {
  const idPart = Number(waiterId).toString(36);
  const expPart = Math.floor((Date.now() + TELEGRAM_LINK_TTL_MS) / 1000).toString(36);
  const signature = signTelegramLink(idPart, expPart);
  return `w_${idPart}_${expPart}_${signature}`;
}

function verifyTelegramLinkToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('_');
  if (parts.length !== 4 || parts[0] !== 'w') return null;
  const [, idPart, expPart, signature] = parts;
  const waiterId = parseInt(idPart, 36);
  const exp = parseInt(expPart, 36);
  if (!Number.isFinite(waiterId) || waiterId <= 0 || !Number.isFinite(exp)) return null;
  if (Date.now() > exp * 1000) return null;

  const expected = signTelegramLink(idPart, expPart);
  if (!signature || signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))) return null;
  return { waiterId, exp };
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
    select: { id: true, name: true, telegramChatId: true, isActive: true }
  });
  if (!waiter || !waiter.isActive) return null;
  const token = generateWaiterToken(waiter);
  return { token, waiter: { id: waiter.id, name: waiter.name, telegramChatId: waiter.telegramChatId } };
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
  await prisma.$transaction([
    prisma.waiterCall.deleteMany({ where: { waiterId: id } }),
    prisma.tableOrder.updateMany({ where: { waiterId: id }, data: { waiterId: null } }),
    prisma.waiterShiftTable.deleteMany({ where: { shift: { waiterId: id } } }),
    prisma.waiterShift.deleteMany({ where: { waiterId: id } }),
    prisma.waiter.delete({ where: { id } })
  ]);
}

async function setWaiterTelegramChatId(waiterId, telegramChatId) {
  return prisma.waiter.update({
    where: { id: waiterId },
    data: { telegramChatId: String(telegramChatId) },
    select: { id: true, name: true, telegramChatId: true, isActive: true }
  });
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
  const shift = await prisma.waiterShift.update({
    where: { id: shiftId },
    data: { isActive: false, endedAt: new Date() },
    select: { id: true, waiterId: true, startedAt: true, endedAt: true, isActive: true }
  });

  await prisma.waiterShiftTable.deleteMany({ where: { shiftId } });

  await prisma.tableOrder.updateMany({
    where: { waiterId: shift.waiterId, status: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] } },
    data: { status: 'CANCELLED' }
  });

  await prisma.waiterCall.deleteMany({
    where: { waiterId: shift.waiterId, status: 'PENDING' }
  });

  broadcastToWaiter(shift.waiterId, { type: 'SHIFT_ENDED' });

  return shift;
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
  if (existing) return { type: 'ALREADY_ASSIGNED', assignment: existing };

  const activeAssignment = await prisma.waiterShiftTable.findFirst({
    where: {
      tableId,
      shift: { isActive: true }
    },
    include: {
      shift: {
        select: {
          id: true,
          waiter: { select: { id: true, name: true } }
        }
      }
    }
  });
  if (activeAssignment && activeAssignment.shiftId !== shiftId) {
    return { type: 'TAKEN', assignment: activeAssignment, waiter: activeAssignment.shift?.waiter || null };
  }

  const assignment = await prisma.waiterShiftTable.create({
    data: { shiftId, tableId },
    select: { id: true, tableId: true, assignedAt: true }
  });
  return { type: 'SUCCESS', assignment };
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

  const activeAssignment = await prisma.waiterShiftTable.findFirst({
    where: {
      tableId: table.id,
      shift: { isActive: true }
    },
    include: {
      shift: {
        select: {
          id: true,
          waiter: { select: { id: true, name: true } }
        }
      }
    }
  });
  if (activeAssignment && activeAssignment.shiftId !== shiftId) {
    return { type: 'TAKEN', table, assignment: activeAssignment, waiter: activeAssignment.shift?.waiter || null };
  }

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
  createTelegramLinkToken,
  verifyTelegramLinkToken,
  setWaiterTelegramChatId,
  startShift,
  endShift,
  getActiveShift,
  assignTableToShift,
  assignTableByCode,
  removeTableFromShift,
  getWaiterForTable,
  getTableByCode
};
