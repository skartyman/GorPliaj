require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient, MapStatus, MapObjectType, EventStatus, EventCtaType } = require('@prisma/client');

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
      name: jsonStr('Main venue map', 'Main venue map', 'Main venue map'),
      description: jsonStr('Main booking map for GorPliaj', 'Main booking map for GorPliaj', 'Main booking map for GorPliaj'),
      status: MapStatus.ACTIVE,
      isDefault: true,
      width: 1600,
      height: 900,
      backgroundColor: '#0f172a',
    },
    create: {
      name: jsonStr('Main venue map', 'Main venue map', 'Main venue map'),
      slug: 'main-venue',
      description: jsonStr('Main booking map for GorPliaj', 'Main booking map for GorPliaj', 'Main booking map for GorPliaj'),
      status: MapStatus.ACTIVE,
      isDefault: true,
      width: 1600,
      height: 900,
      backgroundColor: '#0f172a',
    },
  });

  const zones = {
    beach: await upsertZone(map.id, 'beach', {
      name: jsonStr('Пляж', 'Пляж', 'Beach'),
      color: '#F4A261',
      sortOrder: 1,
    }),
    lounge: await upsertZone(map.id, 'lounge', {
      name: jsonStr('Лаунж', 'Лаунж', 'Lounge'),
      color: '#2A9D8F',
      sortOrder: 2,
    }),
    vip: await upsertZone(map.id, 'vip', {
      name: jsonStr('VIP', 'VIP', 'VIP'),
      color: '#6A4C93',
      sortOrder: 3,
    }),
  };

  const tables = [
    { zoneKey: 'beach', name: jsonStr('Столик 1', 'Столик 1', 'Table 1'), code: 'B-01', seatsMin: 2, seatsMax: 4, deposit: '500.00', photoUrl: null, x: 140, y: 640 },
    { zoneKey: 'beach', name: jsonStr('Столик 2', 'Столик 2', 'Table 2'), code: 'B-02', seatsMin: 2, seatsMax: 4, deposit: '500.00', photoUrl: null, x: 300, y: 640 },
    { zoneKey: 'beach', name: jsonStr('Сімейний', 'Семейный', 'Family'), code: 'B-03', seatsMin: 4, seatsMax: 6, deposit: '700.00', photoUrl: null, x: 470, y: 640 },
    { zoneKey: 'lounge', name: jsonStr('Кутовий', 'Угловой', 'Corner'), code: 'L-01', seatsMin: 2, seatsMax: 4, deposit: '600.00', photoUrl: null, x: 640, y: 470 },
    { zoneKey: 'lounge', name: jsonStr('Центральний', 'Центральный', 'Center'), code: 'L-02', seatsMin: 4, seatsMax: 6, deposit: '800.00', photoUrl: null, x: 820, y: 470 },
    { zoneKey: 'lounge', name: jsonStr('Софа', 'Софа', 'Sofa'), code: 'L-03', seatsMin: 4, seatsMax: 8, deposit: '1000.00', photoUrl: null, x: 1000, y: 470 },
    { zoneKey: 'vip', name: jsonStr('VIP Gold 1', 'VIP Gold 1', 'VIP Gold 1'), code: 'V-01', seatsMin: 4, seatsMax: 6, deposit: '1200.00', photoUrl: null, x: 1220, y: 240 },
    { zoneKey: 'vip', name: jsonStr('VIP Gold 2', 'VIP Gold 2', 'VIP Gold 2'), code: 'V-02', seatsMin: 4, seatsMax: 6, deposit: '1200.00', photoUrl: null, x: 1380, y: 240 },
    { zoneKey: 'vip', name: jsonStr('VIP Platinum', 'VIP Platinum', 'VIP Platinum'), code: 'V-03', seatsMin: 6, seatsMax: 10, deposit: '1800.00', photoUrl: null, x: 1300, y: 420 },
  ];

  for (const table of tables) {
    const tableRecord = await upsertTable(map.id, zones[table.zoneKey].id, {
      name: table.name,
      code: table.code,
      seatsMin: table.seatsMin,
      seatsMax: table.seatsMax,
      deposit: table.deposit,
      photoUrl: table.photoUrl || null,
      isActive: true,
      isBookable: true,
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
      label: jsonStr('Головний бар', 'Главный бар', 'Main Bar'),
      x: 720,
      y: 120,
      width: 260,
      height: 90,
    },
    {
      type: MapObjectType.STAGE,
      label: jsonStr('Літня сцена', 'Летняя сцена', 'Summer Stage'),
      x: 300,
      y: 110,
      width: 280,
      height: 110,
    },
    {
      type: MapObjectType.ENTRANCE,
      label: jsonStr('Головний вхід', 'Главный вход', 'Main Entrance'),
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
      label: jsonStr('Сходи до моря', 'Лестница к морю', 'Sea View Stairs'),
      x: 1180,
      y: 620,
      width: 120,
      height: 84,
    },
    {
      type: MapObjectType.PATH,
      label: jsonStr('Головна алея', 'Главная аллея', 'Main Walkway'),
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
      'П\'ятничний захід на заході сонця на пляжній терасі.',
      'Пятничное мероприятие на закате на пляжной террасе.',
      'Friday sunset set on the beach terrace.'
    ),
    fullDescription: jsonStr(
      'Живий DJ-сет з фірмовими коктейлями, пляжним настроєм і вечірнім небом у GorPliaj.',
      'Живой DJ-сет с фирменными коктейлями, пляжным настроением и вечерним небом в GorPliaj.',
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
      'Вікенд сімейних заходів біля моря.',
      'Выходные семейных мероприятий у моря.',
      'Weekend family-friendly activities by the sea.'
    ),
    fullDescription: jsonStr(
      'Дитячі активності, сімейне меню та затишні зони для візитів у денний час.',
      'Детские активности, семейное меню и уютные зоны для дневных визитов.',
      'Kids activities, family menu offers, and relaxed seating zones for weekend daytime visits.'
    ),
    posterImage: '/icons/lebedi.jpg',
    startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12, 0, 0),
    endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0, 0),
    status: EventStatus.PUBLISHED,
    isFeatured: false,
    ctaType: EventCtaType.BOOKING,
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
