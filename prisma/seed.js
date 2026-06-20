require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient, MapStatus, MapUsageMode, BookingKind, MapObjectType, EventStatus, EventCtaType } = require('@prisma/client');

const prisma = new PrismaClient();

const adminSeedPassword = (process.env.ADMIN_SEED_PASSWORD || '').trim();

if (!adminSeedPassword) {
  throw new Error('ADMIN_SEED_PASSWORD is required to run prisma seed. Set it in your environment or .env file.');
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function jsonStr(uk, ru, en) {
  return { uk, ru, en };
}

async function upsertZone(mapId, zoneKey, zoneData) {
  const existing = await prisma.zone.findFirst({
    where: { mapId, sortOrder: zoneData.sortOrder },
    select: { id: true },
  });

  if (existing) {
    return prisma.zone.update({
      where: { id: existing.id },
      data: zoneData,
    });
  }

  return prisma.zone.create({
    data: { mapId, ...zoneData },
  });
}

async function upsertTable(mapId, zoneId, tableData) {
  const existingTable = await prisma.venueTable.findFirst({
    where: { mapId, code: tableData.code },
    select: { id: true },
  });

  if (existingTable) {
    return prisma.venueTable.update({
      where: { id: existingTable.id },
      data: { ...tableData, zoneId },
    });
  }

  return prisma.venueTable.create({
    data: { mapId, zoneId, ...tableData },
  });
}

async function upsertMapObject(mapId, objectData) {
  const existingObject = await prisma.mapObject.findFirst({
    where: {
      mapId,
      type: objectData.type,
      tableId: objectData.tableId ?? null,
      x: objectData.x,
      y: objectData.y,
    },
    select: { id: true },
  });

  if (existingObject) {
    return prisma.mapObject.update({
      where: { id: existingObject.id },
      data: objectData,
    });
  }

  return prisma.mapObject.create({
    data: { mapId, ...objectData },
  });
}

async function upsertEvent(eventData) {
  const existingEvent = await prisma.event.findUnique({
    where: { slug: eventData.slug },
    select: { id: true },
  });

  if (existingEvent) {
    return prisma.event.update({
      where: { id: existingEvent.id },
      data: eventData,
    });
  }

  return prisma.event.create({ data: eventData });
}

async function main() {
  const adminPasswordHash = await hashPassword(adminSeedPassword);

  const seedUsers = [
    { email: 'owner@gorpliaj.local', role: 'owner' },
    { email: 'manager@gorpliaj.local', role: 'manager' },
    { email: 'admin@gorpliaj.local', role: 'admin' },
    { email: 'hostess@gorpliaj.local', role: 'hostess' },
    { email: 'smm@gorpliaj.local', role: 'seo_smm' },
  ];

  for (const user of seedUsers) {
    await prisma.adminUser.upsert({
      where: { email: user.email },
      update: { password: adminPasswordHash, role: user.role },
      create: { email: user.email, password: adminPasswordHash, role: user.role },
    });
  }

  await prisma.map.updateMany({
    where: {
      slug: { not: 'main-venue' },
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });

  const map = await prisma.map.upsert({
    where: { slug: 'main-venue' },
    update: {
      name: jsonStr('ÐÑÐ½Ð¾Ð²Ð½Ð° ÐºÐ°ÑÑÐ° Ð·Ð°ÐºÐ»Ð°Ð´Ñ', 'ÐÑÐ½Ð¾Ð²Ð½Ð°Ñ ÐºÐ°ÑÑÐ° Ð·Ð°Ð²ÐµÐ´ÐµÐ½Ð¸Ñ', 'Main venue map'),
      description: jsonStr('ÐÐµÐ½Ð½Ð° ÐºÐ°ÑÑÐ° Ð´Ð»Ñ Ð±ÑÐ¾Ð½ÑÐ²Ð°Ð½Ð½Ñ ÑÑÐ¾Ð»ÑÐ² Ñ Ð¿Ð»ÑÐ¶Ð½Ð¾Ð³Ð¾ Ð²ÑÐ´Ð¿Ð¾ÑÐ¸Ð½ÐºÑ', 'ÐÐ½ÐµÐ²Ð½Ð°Ñ ÐºÐ°ÑÑÐ° Ð´Ð»Ñ Ð±ÑÐ¾Ð½Ð¸ÑÐ¾Ð²Ð°Ð½Ð¸Ñ ÑÑÐ¾Ð»Ð¾Ð² Ð¸ Ð¿Ð»ÑÐ¶Ð½Ð¾Ð³Ð¾ Ð¾ÑÐ´ÑÑÐ°', 'Day map for table bookings and beach leisure'),
      status: MapStatus.ACTIVE,
      usageMode: MapUsageMode.DAY,
      isDefault: true,
      width: 1600,
      height: 900,
      backgroundColor: '#0f172a',
    },
    create: {
      name: jsonStr('ÐÑÐ½Ð¾Ð²Ð½Ð° ÐºÐ°ÑÑÐ° Ð·Ð°ÐºÐ»Ð°Ð´Ñ', 'ÐÑÐ½Ð¾Ð²Ð½Ð°Ñ ÐºÐ°ÑÑÐ° Ð·Ð°Ð²ÐµÐ´ÐµÐ½Ð¸Ñ', 'Main venue map'),
      slug: 'main-venue',
      description: jsonStr('ÐÐµÐ½Ð½Ð° ÐºÐ°ÑÑÐ° Ð´Ð»Ñ Ð±ÑÐ¾Ð½ÑÐ²Ð°Ð½Ð½Ñ ÑÑÐ¾Ð»ÑÐ² Ñ Ð¿Ð»ÑÐ¶Ð½Ð¾Ð³Ð¾ Ð²ÑÐ´Ð¿Ð¾ÑÐ¸Ð½ÐºÑ', 'ÐÐ½ÐµÐ²Ð½Ð°Ñ ÐºÐ°ÑÑÐ° Ð´Ð»Ñ Ð±ÑÐ¾Ð½Ð¸ÑÐ¾Ð²Ð°Ð½Ð¸Ñ ÑÑÐ¾Ð»Ð¾Ð² Ð¸ Ð¿Ð»ÑÐ¶Ð½Ð¾Ð³Ð¾ Ð¾ÑÐ´ÑÑÐ°', 'Day map for table bookings and beach leisure'),
      status: MapStatus.ACTIVE,
      usageMode: MapUsageMode.DAY,
      isDefault: true,
      width: 1600,
      height: 900,
      backgroundColor: '#0f172a',
    },
  });

  const zones = {
    beach: await upsertZone(map.id, 'beach', {
      name: jsonStr('Öåíòð ïëÿæó', 'Öåíòð ïëÿæà', 'Beach center'),
      color: '#F4A261',
      sortOrder: 1,
    }),
    lounge: await upsertZone(map.id, 'lounge', {
      name: jsonStr('Òåðàñà', 'Òåððàñà', 'Terrace'),
      color: '#2A9D8F',
      sortOrder: 2,
    }),
    vip: await upsertZone(map.id, 'vip', {
      name: jsonStr('Ðåñòîðàí', 'Ðåñòîðàí', 'Restaurant'),
      color: '#6A4C93',
      sortOrder: 3,
    }),
  };

  const tables = [
    { zoneKey: 'beach', name: jsonStr('Ð¡ÑÐ¾Ð»Ð¸Ðº 1', 'Ð¡ÑÐ¾Ð»Ð¸Ðº 1', 'Table 1'), code: 'B-01', seatsMin: 2, seatsMax: 4, deposit: '500.00', photoUrl: null, x: 140, y: 640 },
    { zoneKey: 'beach', name: jsonStr('Ð¡ÑÐ¾Ð»Ð¸Ðº 2', 'Ð¡ÑÐ¾Ð»Ð¸Ðº 2', 'Table 2'), code: 'B-02', seatsMin: 2, seatsMax: 4, deposit: '500.00', photoUrl: null, x: 300, y: 640 },
    { zoneKey: 'beach', name: jsonStr('Ð¡ÑÐ¼ÐµÐ¹Ð½Ð¸Ð¹', 'Ð¡ÐµÐ¼ÐµÐ¹Ð½ÑÐ¹', 'Family'), code: 'B-03', seatsMin: 4, seatsMax: 6, deposit: '700.00', photoUrl: null, x: 470, y: 640 },
    { zoneKey: 'lounge', name: jsonStr('ÐÑÑÐ¾Ð²Ð¸Ð¹', 'Ð£Ð³Ð»Ð¾Ð²Ð¾Ð¹', 'Corner'), code: 'L-01', seatsMin: 2, seatsMax: 4, deposit: '600.00', photoUrl: null, x: 640, y: 470 },
    { zoneKey: 'lounge', name: jsonStr('Ð¦ÐµÐ½ÑÑÐ°Ð»ÑÐ½Ð¸Ð¹', 'Ð¦ÐµÐ½ÑÑÐ°Ð»ÑÐ½ÑÐ¹', 'Center'), code: 'L-02', seatsMin: 4, seatsMax: 6, deposit: '800.00', photoUrl: null, x: 820, y: 470 },
    { zoneKey: 'lounge', name: jsonStr('Ð¡Ð¾ÑÐ°', 'Ð¡Ð¾ÑÐ°', 'Sofa'), code: 'L-03', seatsMin: 4, seatsMax: 8, deposit: '1000.00', photoUrl: null, x: 1000, y: 470 },
    { zoneKey: 'vip', name: jsonStr('VIP Gold 1', 'VIP Gold 1', 'VIP Gold 1'), code: 'V-01', seatsMin: 4, seatsMax: 6, deposit: '1200.00', photoUrl: null, x: 1220, y: 240 },
    { zoneKey: 'vip', name: jsonStr('VIP Gold 2', 'VIP Gold 2', 'VIP Gold 2'), code: 'V-02', seatsMin: 4, seatsMax: 6, deposit: '1200.00', photoUrl: null, x: 1380, y: 240 },
    { zoneKey: 'vip', name: jsonStr('VIP Platinum', 'VIP Platinum', 'VIP Platinum'), code: 'V-03', seatsMin: 6, seatsMax: 10, deposit: '1800.00', photoUrl: null, x: 1300, y: 420 },
  ];

  for (const table of tables) {
    const tableRecord = await upsertTable(map.id, zones[table.zoneKey].id, {
      name: table.name,
      code: table.code,
      bookingKind: table.zoneKey === 'beach' ? BookingKind.BEACH : BookingKind.TABLE,
      seatsMin: table.seatsMin,
      seatsMax: table.seatsMax,
      deposit: table.deposit,
      photoUrl: table.photoUrl || null,
      serviceName: table.name,
      serviceDescription: null,
      isActive: true,
      isBookable: true,
      sortOrder: 0,
    });

    await upsertMapObject(map.id, {
      tableId: tableRecord.id,
      type: MapObjectType.TABLE,
      label: jsonStr(table.code, table.code, table.code),
      x: table.x,
      y: table.y,
      width: 120,
      height: 80,
      rotation: 0,
      zIndex: 1,
      isActive: true,
    });
  }

  const staticObjects = [
    {
      type: MapObjectType.BAR,
      label: jsonStr('ÐÐ¾Ð»Ð¾Ð²Ð½Ð¸Ð¹ Ð±Ð°Ñ', 'ÐÐ»Ð°Ð²Ð½ÑÐ¹ Ð±Ð°Ñ', 'Main Bar'),
      x: 720,
      y: 120,
      width: 260,
      height: 90,
    },
    {
      type: MapObjectType.STAGE,
      label: jsonStr('ÐÑÑÐ½Ñ ÑÑÐµÐ½Ð°', 'ÐÐµÑÐ½ÑÑ ÑÑÐµÐ½Ð°', 'Summer Stage'),
      x: 300,
      y: 110,
      width: 280,
      height: 110,
    },
    {
      type: MapObjectType.ENTRANCE,
      label: jsonStr('ÐÐ¾Ð»Ð¾Ð²Ð½Ð¸Ð¹ Ð²ÑÑÐ´', 'ÐÐ»Ð°Ð²Ð½ÑÐ¹ Ð²ÑÐ¾Ð´', 'Main Entrance'),
      x: 40,
      y: 360,
      width: 100,
      height: 140,
    },
    {
      type: MapObjectType.WC,
      label: jsonStr('WC', 'WC', 'WC'),
      x: 1460,
      y: 100,
      width: 90,
      height: 70,
    },
    {
      type: MapObjectType.STAIRS,
      label: jsonStr('Ð¡ÑÐ¾Ð´Ð¸ Ð´Ð¾ Ð¼Ð¾ÑÑ', 'ÐÐµÑÑÐ½Ð¸ÑÐ° Ðº Ð¼Ð¾ÑÑ', 'Sea View Stairs'),
      x: 1180,
      y: 620,
      width: 120,
      height: 84,
    },
    {
      type: MapObjectType.PATH,
      label: jsonStr('ÐÐ¾Ð»Ð¾Ð²Ð½Ð° Ð°Ð»ÐµÑ', 'ÐÐ»Ð°Ð²Ð½Ð°Ñ Ð°Ð»Ð»ÐµÑ', 'Main Walkway'),
      x: 120,
      y: 760,
      width: 1220,
      height: 44,
    },
  ];

  for (const object of staticObjects) {
    await upsertMapObject(map.id, {
      tableId: null,
      type: object.type,
      label: object.label,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      rotation: 0,
      zIndex: 1,
      isActive: true,
    });
  }



  const now = new Date();
  await upsertEvent({
    title: jsonStr('Sunset DJ Session', 'Sunset DJ Session', 'Sunset DJ Session'),
    slug: 'sunset-dj-session',
    shortDescription: jsonStr(
      'Ð\'ÑÑÐ½Ð¸ÑÐ½Ð¸Ð¹ Ð·Ð°ÑÑÐ´ Ð½Ð° Ð·Ð°ÑÐ¾Ð´Ñ ÑÐ¾Ð½ÑÑ Ð½Ð° Ð¿Ð»ÑÐ¶Ð½ÑÐ¹ ÑÐµÑÐ°ÑÑ.',
      'ÐÑÑÐ½Ð¸ÑÐ½Ð¾Ðµ Ð¼ÐµÑÐ¾Ð¿ÑÐ¸ÑÑÐ¸Ðµ Ð½Ð° Ð·Ð°ÐºÐ°ÑÐµ Ð½Ð° Ð¿Ð»ÑÐ¶Ð½Ð¾Ð¹ ÑÐµÑÑÐ°ÑÐµ.',
      'Friday sunset set on the beach terrace.'
    ),
    fullDescription: jsonStr(
      'ÐÐ¸Ð²Ð¸Ð¹ DJ-ÑÐµÑ Ð· ÑÑÑÐ¼Ð¾Ð²Ð¸Ð¼Ð¸ ÐºÐ¾ÐºÑÐµÐ¹Ð»ÑÐ¼Ð¸, Ð¿Ð»ÑÐ¶Ð½Ð¸Ð¼ Ð½Ð°ÑÑÑÐ¾ÑÐ¼ Ñ Ð²ÐµÑÑÑÐ½ÑÐ¼ Ð½ÐµÐ±Ð¾Ð¼ Ñ GorPliaj.',
      'ÐÐ¸Ð²Ð¾Ð¹ DJ-ÑÐµÑ Ñ ÑÐ¸ÑÐ¼ÐµÐ½Ð½ÑÐ¼Ð¸ ÐºÐ¾ÐºÑÐµÐ¹Ð»ÑÐ¼Ð¸, Ð¿Ð»ÑÐ¶Ð½ÑÐ¼ Ð½Ð°ÑÑÑÐ¾ÐµÐ½Ð¸ÐµÐ¼ Ð¸ Ð²ÐµÑÐµÑÐ½Ð¸Ð¼ Ð½ÐµÐ±Ð¾Ð¼ Ð² GorPliaj.',
      'Live DJ set with signature cocktails, beach lounge mood, and evening skyline at GorPliaj.'
    ),
    posterImage: '/icons/photo_2026-03-22_18-51-11.jpg',
    startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 19, 0, 0),
    endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 30, 0),
    status: EventStatus.PUBLISHED,
    isFeatured: true,
    ctaType: EventCtaType.BOTH,
    ticketUrl: 'https://example.com/tickets/sunset-dj-session',
  });

  await upsertEvent({
    title: jsonStr('Family Beach Weekend', 'Family Beach Weekend', 'Family Beach Weekend'),
    slug: 'family-beach-weekend',
    shortDescription: jsonStr(
      'ÐÑÐºÐµÐ½Ð´ ÑÑÐ¼ÐµÐ¹Ð½Ð¸Ñ Ð·Ð°ÑÐ¾Ð´ÑÐ² Ð±ÑÐ»Ñ Ð¼Ð¾ÑÑ.',
      'ÐÑÑÐ¾Ð´Ð½ÑÐµ ÑÐµÐ¼ÐµÐ¹Ð½ÑÑ Ð¼ÐµÑÐ¾Ð¿ÑÐ¸ÑÑÐ¸Ð¹ Ñ Ð¼Ð¾ÑÑ.',
      'Weekend family-friendly activities by the sea.'
    ),
    fullDescription: jsonStr(
      'ÐÐ¸ÑÑÑÑ Ð°ÐºÑÐ¸Ð²Ð½Ð¾ÑÑÑ, ÑÑÐ¼ÐµÐ¹Ð½Ðµ Ð¼ÐµÐ½Ñ ÑÐ° Ð·Ð°ÑÐ¸ÑÐ½Ñ Ð·Ð¾Ð½Ð¸ Ð´Ð»Ñ Ð²ÑÐ·Ð¸ÑÑÐ² Ñ Ð´ÐµÐ½Ð½Ð¸Ð¹ ÑÐ°Ñ.',
      'ÐÐµÑÑÐºÐ¸Ðµ Ð°ÐºÑÐ¸Ð²Ð½Ð¾ÑÑÐ¸, ÑÐµÐ¼ÐµÐ¹Ð½Ð¾Ðµ Ð¼ÐµÐ½Ñ Ð¸ ÑÑÑÐ½ÑÐµ Ð·Ð¾Ð½Ñ Ð´Ð»Ñ Ð´Ð½ÐµÐ²Ð½ÑÑ Ð²Ð¸Ð·Ð¸ÑÐ¾Ð².',
      'Kids activities, family menu offers, and relaxed seating zones for weekend daytime visits.'
    ),
    posterImage: '/icons/lebedi.jpg',
    startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12, 0, 0),
    endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0, 0),
    status: EventStatus.PUBLISHED,
    isFeatured: false,
    ctaType: EventCtaType.BOOKING,
    preferredMapUsageMode: MapUsageMode.DAY,
    ticketUrl: null,
  });

  await upsertEvent({
    title: 'Family Beach Weekend',
    slug: 'family-beach-weekend',
    shortDescription: 'Weekend family-friendly activities by the sea.',
    fullDescription: 'Kids activities, family menu offers, and relaxed seating zones for weekend daytime visits.',
    posterImage: '/icons/lebedi.jpg',
    startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12, 0, 0),
    endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0, 0),
    status: EventStatus.PUBLISHED,
    isFeatured: false,
    ctaType: EventCtaType.BOOKING,
    preferredMapUsageMode: MapUsageMode.DAY,
    ticketUrl: null,
  });

  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

