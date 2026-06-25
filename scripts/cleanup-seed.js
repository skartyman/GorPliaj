require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Starting cleanup of seed data...');

  const seedTableCodes = ['B-01', 'B-02', 'B-03', 'L-01', 'L-02', 'L-03', 'V-01', 'V-02', 'V-03'];
  
  const seedTables = await prisma.venueTable.findMany({
    where: { code: { in: seedTableCodes } },
    select: { id: true }
  });
  
  const seedTableIds = seedTables.map(t => t.id);
  console.log(`Found ${seedTableIds.length} seed tables.`);

  if (seedTableIds.length > 0) {
    // 1. Find and delete payments and reservations linked to seed tables
    const reservations = await prisma.reservation.findMany({
      where: { tableId: { in: seedTableIds } },
      select: { id: true }
    });
    const reservationIds = reservations.map(r => r.id);
    console.log(`Found ${reservationIds.length} reservations linked to seed tables.`);

    if (reservationIds.length > 0) {
      const deletedPayments = await prisma.payment.deleteMany({
        where: { reservationId: { in: reservationIds } }
      });
      console.log(`Deleted ${deletedPayments.count} payments.`);

      const deletedReservations = await prisma.reservation.deleteMany({
        where: { id: { in: reservationIds } }
      });
      console.log(`Deleted ${deletedReservations.count} reservations.`);
    }

    // 2. Delete map objects linked to seed tables
    const deletedObjects = await prisma.mapObject.deleteMany({
      where: { tableId: { in: seedTableIds } }
    });
    console.log(`Deleted ${deletedObjects.count} map objects linked to seed tables.`);

    // 3. Delete venue tables
    const deletedTables = await prisma.venueTable.deleteMany({
      where: { id: { in: seedTableIds } }
    });
    console.log(`Deleted ${deletedTables.count} venue tables.`);
  }

  // 4. Delete static map objects created by seed
  const staticLabels = [
    'Головний бар', 'Главный бар', 'Main Bar',
    'Літня сцена', 'Летняя сцена', 'Summer Stage',
    'Головний вхід', 'Главный вход', 'Main Entrance',
    'WC',
    'Сходи до моря', 'Лестница к морю', 'Sea View Stairs',
    'Головна алея', 'Главная аллея', 'Main Walkway'
  ];

  const allObjects = await prisma.mapObject.findMany({
    where: { tableId: null }
  });

  const objectsToDelete = allObjects.filter(obj => {
    if (!obj.label) return false;
    const labelStr = JSON.stringify(obj.label);
    return staticLabels.some(label => labelStr.includes(label));
  });

  console.log(`Found ${objectsToDelete.length} static seed map objects to delete.`);

  if (objectsToDelete.length > 0) {
    const deletedStatic = await prisma.mapObject.deleteMany({
      where: { id: { in: objectsToDelete.map(o => o.id) } }
    });
    console.log(`Deleted ${deletedStatic.count} static map objects.`);
  }

  // 5. Delete seed event
  const deletedEvent = await prisma.event.deleteMany({
    where: { slug: 'sunset-dj-session' }
  });
  console.log(`Deleted ${deletedEvent.count} seed events.`);

  console.log('Cleanup completed successfully.');
}

cleanup()
  .catch(err => console.error('Error during cleanup:', err))
  .finally(() => prisma.$disconnect());
