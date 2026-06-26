require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function mergeZones() {
  console.log('Starting zone merging and cleanup...');

  // 1. Move tables from Lounge (id: 2) and VIP (id: 3) to Beach (id: 1)
  const movedLounge = await prisma.venueTable.updateMany({
    where: { zoneId: 2 },
    data: { zoneId: 1 }
  });
  console.log(`Moved ${movedLounge.count} tables from Lounge (2) to Beach (1).`);

  const movedVip = await prisma.venueTable.updateMany({
    where: { zoneId: 3 },
    data: { zoneId: 1 }
  });
  console.log(`Moved ${movedVip.count} tables from VIP (3) to Beach (1).`);

  // 2. Move reservations from Lounge (id: 2) and VIP (id: 3) to Beach (id: 1)
  const movedReservationsLounge = await prisma.reservation.updateMany({
    where: { zoneId: 2 },
    data: { zoneId: 1 }
  });
  console.log(`Moved ${movedReservationsLounge.count} reservations from Lounge (2) to Beach (1).`);

  const movedReservationsVip = await prisma.reservation.updateMany({
    where: { zoneId: 3 },
    data: { zoneId: 1 }
  });
  console.log(`Moved ${movedReservationsVip.count} reservations from VIP (3) to Beach (1).`);

  // 3. Update MapObject metaJson zoneId from 2 or 3 to 1
  const mapObjects = await prisma.mapObject.findMany({
    where: {
      OR: [
        { metaJson: { path: ['zoneId'], equals: 2 } },
        { metaJson: { path: ['zoneId'], equals: 3 } },
        { metaJson: { path: ['zoneId'], equals: '2' } },
        { metaJson: { path: ['zoneId'], equals: '3' } }
      ]
    }
  });

  console.log(`Found ${mapObjects.length} map objects with zoneId 2 or 3 in metaJson.`);

  for (const obj of mapObjects) {
    const meta = obj.metaJson || {};
    meta.zoneId = 1; // Update to Beach

    await prisma.mapObject.update({
      where: { id: obj.id },
      data: { metaJson: meta }
    });
  }
  console.log('Updated map objects metaJson successfully.');

  // 4. Delete the zones Lounge (id: 2) and VIP (id: 3)
  const deletedZones = await prisma.zone.deleteMany({
    where: { id: { in: [2, 3] } }
  });
  console.log(`Deleted ${deletedZones.count} zones (Lounge and VIP).`);

  console.log('Zone merging and cleanup completed successfully.');
}

mergeZones()
  .catch(err => console.error('Error:', err))
  .finally(() => prisma.$disconnect());
