const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== MAPS ===');
  const maps = await prisma.map.findMany({
    include: {
      zones: true,
      tables: {
        select: {
          id: true,
          zoneId: true,
          code: true,
          name: true,
        }
      }
    }
  });

  for (const map of maps) {
    console.log(`Map: "${map.slug}" (ID: ${map.id}, Name: ${JSON.stringify(map.name)}, Mode: ${map.usageMode})`);
    console.log('Zones in this map:');
    for (const zone of map.zones) {
      const tableCount = map.tables.filter(t => t.zoneId === zone.id).length;
      console.log(` - Zone ID: ${zone.id}, Name: ${JSON.stringify(zone.name)}, Tables count: ${tableCount}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
