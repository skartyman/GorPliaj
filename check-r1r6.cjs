const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check R-1 (both id=5 and id=70 are linked)
  const r1objects = await prisma.mapObject.findMany({
    where: { tableId: { in: [5, 70] } },
    select: { id: true, type: true, label: true, tableId: true, x: true, y: true }
  });
  console.log('R-1 map objects:');
  for (const o of r1objects) {
    console.log(`  MapObject id=${o.id} type=${o.type} tableId=${o.tableId} x=${o.x} y=${o.y} label=${JSON.stringify(o.label)}`);
  }
  console.log('');

  // Check R-6 (id=28 and id=29 are linked)
  const r6objects = await prisma.mapObject.findMany({
    where: { tableId: { in: [28, 29] } },
    select: { id: true, type: true, label: true, tableId: true, x: true, y: true }
  });
  console.log('R-6 map objects:');
  for (const o of r6objects) {
    console.log(`  MapObject id=${o.id} type=${o.type} tableId=${o.tableId} x=${o.x} y=${o.y} label=${JSON.stringify(o.label)}`);
  }
  console.log('');

  // Also check id=14 (R-6 unlinked) - any map object for it?
  const orphan = await prisma.mapObject.findFirst({
    where: { tableId: 14 },
    select: { id: true }
  });
  console.log(`R-6 unlinked id=14 has mapObject: ${!!orphan}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
