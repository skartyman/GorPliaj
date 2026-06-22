const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const types = [
    { value: 'BUNGALOW', name: { ua: 'Бунгало', ru: 'Бунгало', en: 'Bungalow' }, code: 'B', requiresSide: true, bookingKind: 'BEACH', sortOrder: 1 },
    { value: 'KROVAT', name: { ua: 'Ліжко', ru: 'Кровать', en: 'Daybed' }, code: 'K', requiresSide: true, bookingKind: 'BEACH', sortOrder: 2 },
    { value: 'PIER', name: { ua: 'Пірс', ru: 'Пирс', en: 'Pier' }, code: 'P', requiresSide: false, bookingKind: 'BEACH', sortOrder: 3 },
    { value: 'RESTAURANT', name: { ua: 'Ресторан', ru: 'Ресторан', en: 'Restaurant' }, code: 'R', requiresSide: false, bookingKind: 'TABLE', sortOrder: 4 },
    { value: 'TERRACE', name: { ua: 'Тераса', ru: 'Терраса', en: 'Terrace' }, code: 'T', requiresSide: false, bookingKind: 'TABLE', sortOrder: 5 }
  ];
  for (const t of types) {
    await prisma.positionType.upsert({
      where: { value: t.value },
      update: t,
      create: t
    });
    console.log('Seeded:', t.value);
  }
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
