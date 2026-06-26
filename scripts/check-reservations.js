const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.reservation.count();
  console.log(`Total reservations in database: ${count}`);
  
  const latest = await prisma.reservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Latest 5 reservations:');
  for (const r of latest) {
    console.log(`- ID: ${r.id}, Name: ${r.customerName}, Phone: ${r.customerPhone}, Date: ${r.reservationDate}, Status: ${r.status}, CreatedAt: ${r.createdAt}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
