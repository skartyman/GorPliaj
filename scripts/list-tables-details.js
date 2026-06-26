const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.venueTable.findMany({
    where: { mapId: 1 },
    include: {
      mapObjects: true
    }
  });

  console.log(`Total tables in main-venue (mapId: 1): ${tables.length}`);
  
  // Group by current zoneId
  const zones = {};
  for (const t of tables) {
    if (!zones[t.zoneId]) zones[t.zoneId] = [];
    zones[t.zoneId].push(t);
  }

  for (const [zoneId, zoneTables] of Object.entries(zones)) {
    console.log(`\nZone ID: ${zoneId} (Count: ${zoneTables.length})`);
    // Sort tables by code or name
    zoneTables.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    for (const t of zoneTables) {
      const coords = t.mapObjects.map(o => `(${o.x}, ${o.y}, w:${o.width}, h:${o.height})`).join(', ');
      console.log(` - Table ID: ${t.id}, Code: ${t.code}, Name: ${JSON.stringify(t.name)}, BookingKind: ${t.bookingKind}, Coords: ${coords}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
