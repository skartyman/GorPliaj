const prisma = require('../lib/prisma');

async function listPositionTypes() {
  return prisma.positionType.findMany({
    orderBy: { sortOrder: 'asc' }
  });
}

async function getPositionTypeByValue(value) {
  return prisma.positionType.findUnique({ where: { value } });
}

async function createPositionType(input) {
  if (!input.value || !input.name || !input.code || !input.bookingKind) {
    return { type: 'INVALID', message: 'value, name, code, and bookingKind are required.' };
  }

  const existing = await prisma.positionType.findUnique({ where: { value: input.value } });
  if (existing) {
    return { type: 'CONFLICT', message: 'A position type with this value already exists.' };
  }

  const type = await prisma.positionType.create({
    data: {
      value: String(input.value).trim().toUpperCase(),
      name: input.name,
      code: String(input.code).trim().toUpperCase(),
      requiresSide: Boolean(input.requiresSide),
      bookingKind: String(input.bookingKind).trim().toUpperCase() === 'BEACH' ? 'BEACH' : 'TABLE',
      sortOrder: Number.isInteger(input.sortOrder) ? input.sortOrder : 0,
      isActive: input.isActive !== false
    }
  });

  return { type: 'SUCCESS', positionType: type };
}

async function updatePositionType(id, input) {
  const existing = await prisma.positionType.findUnique({ where: { id } });
  if (!existing) {
    return { type: 'NOT_FOUND', message: 'Position type not found.' };
  }

  const data = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.code !== undefined) data.code = String(input.code).trim().toUpperCase();
  if (input.requiresSide !== undefined) data.requiresSide = Boolean(input.requiresSide);
  if (input.bookingKind !== undefined) data.bookingKind = String(input.bookingKind).trim().toUpperCase() === 'BEACH' ? 'BEACH' : 'TABLE';
  if (input.sortOrder !== undefined) data.sortOrder = Number.isInteger(input.sortOrder) ? input.sortOrder : 0;
  if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);

  const updated = await prisma.positionType.update({
    where: { id },
    data
  });

  return { type: 'SUCCESS', positionType: updated };
}

async function deletePositionType(id) {
  const existing = await prisma.positionType.findUnique({ where: { id } });
  if (!existing) {
    return { type: 'NOT_FOUND', message: 'Position type not found.' };
  }

  const inUse = await prisma.venueTable.count({
    where: { positionType: existing.value }
  });

  if (inUse > 0) {
    return {
      type: 'CONFLICT',
      message: `Cannot delete "${existing.value}" — ${inUse} position(s) use this type.`
    };
  }

  await prisma.positionType.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

module.exports = {
  listPositionTypes,
  getPositionTypeByValue,
  createPositionType,
  updatePositionType,
  deletePositionType
};
