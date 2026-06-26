const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.venueTable.findMany({
    where: { zoneId: 1 },
    orderBy: { code: 'asc' }
  });

  console.log(`Tables in Zone 1 (Beach): ${tables.length}`);
  for (const t of tables) {
    console.log(`ID: ${t.id}, Code: ${t.code}, Name: ${JSON.stringify(t.name)}, BookingKind: ${t.bookingKind}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
