const prisma = require('../lib/prisma');

async function listBeachRows(mapId) {
  const zones = await prisma.zone.findMany({
    where: { mapId },
    select: { id: true }
  });
  const zoneIds = zones.map((z) => z.id);
  return prisma.beachRow.findMany({
    where: { zoneId: { in: zoneIds } },
    orderBy: [{ zoneId: 'asc' }, { sortOrder: 'asc' }]
  });
}

async function createBeachRow(mapId, input) {
  const zone = await prisma.zone.findFirst({
    where: { id: Number(input.zoneId), mapId },
    select: { id: true }
  });
  if (!zone) return { type: 'INVALID', message: 'Zone not found.' };

  const maxOrder = await prisma.beachRow.aggregate({
    where: { zoneId: zone.id },
    _max: { sortOrder: true }
  });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await prisma.beachRow.create({
    data: {
      zoneId: zone.id,
      sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : nextOrder
    }
  });
  return { type: 'SUCCESS', beachRow: row };
}

async function updateBeachRow(id, input) {
  const existing = await prisma.beachRow.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND', message: 'Beach row not found.' };

  const data = {};
  if (input.sortOrder !== undefined) data.sortOrder = Number(input.sortOrder);

  const updated = await prisma.beachRow.update({ where: { id }, data });
  return { type: 'SUCCESS', beachRow: updated };
}

async function deleteBeachRow(id) {
  const existing = await prisma.beachRow.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND', message: 'Beach row not found.' };

  const inUse = await prisma.venueTable.count({ where: { rowId: id } });
  if (inUse > 0) return { type: 'CONFLICT', message: `Cannot delete row — ${inUse} position(s) use it.` };

  await prisma.beachRow.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

module.exports = { listBeachRows, createBeachRow, updateBeachRow, deleteBeachRow };
