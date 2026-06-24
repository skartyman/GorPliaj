const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Map: duplicateId -> correctId (the one linked to map objects)
const REDIRECT = { 10: 24, 20: 33 };
const TO_DELETE = [20, 19, 18, 17, 76, 10, 11, 12, 13, 14];

async function main() {
  // Redirect reservations from duplicate -> correct table
  for (const [fromId, toId] of Object.entries(REDIRECT)) {
    const res = await prisma.reservation.updateMany({
      where: { tableId: Number(fromId) },
      data: { tableId: Number(toId) }
    });
    if (res.count > 0) console.log(`Redirected ${res.count} reservation(s) from tableId=${fromId} -> ${toId}`);
  }

  // Delete holds linked to duplicates
  const holds = await prisma.tableHold.findMany({
    where: { tableId: { in: TO_DELETE } },
    select: { id: true }
  });
  if (holds.length > 0) {
    await prisma.tableHold.deleteMany({ where: { id: { in: holds.map(h => h.id) } } });
    console.log(`Deleted ${holds.length} hold(s)`);
  }

  // Delete overrides linked to duplicates
  const overrides = await prisma.venueTableOverride.deleteMany({
    where: { tableId: { in: TO_DELETE } }
  });
  if (overrides.count > 0) console.log(`Deleted ${overrides.count} override(s)`);

  // Delete the venue tables
  const result = await prisma.venueTable.deleteMany({
    where: { id: { in: TO_DELETE } }
  });
  console.log(`Deleted ${result.count} venue table(s)`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
