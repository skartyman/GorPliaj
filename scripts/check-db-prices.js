const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  try {
    console.log('--- Position Types in Database ---');
    const types = await prisma.positionType.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    
    if (types.length === 0) {
      console.log('No position types found in database.');
    } else {
      types.forEach(pt => {
        console.log(`ID: ${pt.id} | Value: ${pt.value} | Name (UA): ${pt.name?.ua || '—'} | Code: ${pt.code} | Default Price: ${pt.defaultPrice ? pt.defaultPrice.toString() : 'NULL'} | Default Deposit: ${pt.defaultDeposit ? pt.defaultDeposit.toString() : 'NULL'} | Kind: ${pt.bookingKind} | Active: ${pt.isActive}`);
      });
    }

    console.log('\n--- Venue Tables (Positions) with Custom Prices in Database ---');
    const customPricedTables = await prisma.venueTable.findMany({
      where: {
        OR: [
          { price: { not: null } },
          { deposit: { gt: 0 } }
        ]
      },
      select: {
        id: true,
        code: true,
        bookingKind: true,
        price: true,
        deposit: true,
        zone: { select: { name: true } },
        positionType: true
      },
      take: 20
    });

    if (customPricedTables.length === 0) {
      console.log('No positions with custom prices or deposits found in database.');
    } else {
      customPricedTables.forEach(t => {
        console.log(`ID: ${t.id} | Code: ${t.code || '—'} | Zone: ${t.zone?.name?.ua || '—'} | Type: ${t.positionType || '—'} | Price: ${t.price ? t.price.toString() : 'NULL'} | Deposit: ${t.deposit ? t.deposit.toString() : '0'}`);
      });
    }

  } catch (error) {
    console.error('Error checking prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrices();
