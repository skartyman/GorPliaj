const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.venueTable.groupBy({
    by: ['mapId', 'positionType', 'code', 'positionSide'],
    _count: { id: true }
  });
  const dups = groups.filter(r => r._count.id > 1);

  for (const d of dups) {
    const tables = await prisma.venueTable.findMany({
      where: {
        mapId: d.mapId,
        positionType: d.positionType,
        code: d.code,
        positionSide: d.positionSide
      },
      select: { id: true, code: true, positionType: true, positionSide: true }
    });
    const ids = tables.map(t => t.id);
    const linked = await prisma.mapObject.findMany({
      where: { tableId: { in: ids } },
      select: { id: true, tableId: true, type: true }
    });
    const linkedIds = new Set(linked.map(o => o.tableId));
    console.log(`mapId=${d.mapId} ${d.positionType} code=${d.code} side=${d.positionSide}:`);
    for (const t of tables) {
      const hasLinked = linkedIds.has(t.id);
      console.log(`  id=${t.id} ${hasLinked ? '<<< LINKED' : ''}`);
    }
    console.log('');
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
