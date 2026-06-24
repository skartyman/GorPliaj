const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.venueTable.groupBy({
    by: ['mapId', 'positionType', 'code', 'positionSide'],
    _count: { id: true }
  });
  const dups = result.filter(r => r._count.id > 1);
  if (dups.length === 0) {
    console.log('OK: no duplicates found');
  } else {
    console.log('Duplicates:');
    for (const d of dups) {
      console.log(`  mapId=${d.mapId} positionType=${d.positionType} code=${d.code} positionSide=${d.positionSide} count=${d._count.id}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
