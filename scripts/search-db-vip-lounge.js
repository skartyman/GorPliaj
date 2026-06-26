const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Searching database for VIP, Lounge, Лаунж...');

  // 1. Check Maps
  const maps = await prisma.map.findMany();
  for (const m of maps) {
    const str = JSON.stringify(m);
    if (/vip|lounge|лаунж/i.test(str)) {
      console.log(`[FOUND in Map ID: ${m.id} (${m.slug})]:`, JSON.stringify(m.name));
    }
  }

  // 2. Check Zones
  const zones = await prisma.zone.findMany();
  for (const z of zones) {
    const str = JSON.stringify(z);
    if (/vip|lounge|лаунж/i.test(str)) {
      console.log(`[FOUND in Zone ID: ${z.id} (Map: ${z.mapId})]:`, JSON.stringify(z.name));
    }
  }

  // 3. Check VenueTables
  const tables = await prisma.venueTable.findMany();
  for (const t of tables) {
    const str = JSON.stringify(t);
    if (/vip|lounge|лаунж/i.test(str)) {
      console.log(`[FOUND in VenueTable ID: ${t.id} (Code: ${t.code})]:`, JSON.stringify(t.name));
    }
  }

  // 4. Check MapObjects
  const objects = await prisma.mapObject.findMany();
  for (const o of objects) {
    const str = JSON.stringify(o);
    if (/vip|lounge|лаунж/i.test(str)) {
      console.log(`[FOUND in MapObject ID: ${o.id} (Table: ${o.tableId})]:`, JSON.stringify(o.label));
    }
  }

  // 5. Check Reservations
  const reservations = await prisma.reservation.findMany();
  for (const r of reservations) {
    const str = JSON.stringify(r);
    if (/vip|lounge|лаунж/i.test(str)) {
      console.log(`[FOUND in Reservation ID: ${r.id} (Guest: ${r.customerName})]:`, r.commentCustomer, r.commentAdmin);
    }
  }

  console.log('Search completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
