require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient, MapStatus, MapObjectType } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_PASSWORD = 'gorpliaj-test-password';

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function upsertZone(mapId, zoneData) {
  const existingZone = await prisma.zone.findFirst({
    where: {
      mapId,
      name: zoneData.name,
    },
    select: { id: true },
  });

  if (existingZone) {
    return prisma.zone.update({
      where: { id: existingZone.id },
      data: zoneData,
    });
  }

  return prisma.zone.create({
    data: {
      mapId,
      ...zoneData,
    },
  });
}

async function upsertTable(mapId, zoneId, tableData) {
  const existingTable = await prisma.venueTable.findFirst({
    where: {
      mapId,
      code: tableData.code,
    },
    select: { id: true },
  });

  if (existingTable) {
    return prisma.venueTable.update({
      where: { id: existingTable.id },
      data: {
        ...tableData,
        zoneId,
      },
    });
  }

  return prisma.venueTable.create({
    data: {
      mapId,
      zoneId,
      ...tableData,
    },
  });
}

async function upsertMapObject(mapId, objectData) {
  const baseWhere = {
    mapId,
    type: objectData.type,
    tableId: objectData.tableId ?? null,
  };

  const existingObject = await prisma.mapObject.findFirst({
    where: objectData.type === MapObjectType.TABLE
      ? baseWhere
      : {
          ...baseWhere,
          label: objectData.label ?? null,
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
    data: {
      mapId,
      ...objectData,
    },
  });
}

async function main() {
  const adminPasswordHash = await hashPassword(TEST_PASSWORD);

  await prisma.adminUser.upsert({
    where: { email: 'admin@gorpliaj.local' },
    update: {
      password: adminPasswordHash,
      role: 'owner',
    },
    create: {
      email: 'admin@gorpliaj.local',
      password: adminPasswordHash,
      role: 'owner',
    },
  });

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
      name: 'Main venue map',
      description: 'Main booking map for GorPliaj',
      status: MapStatus.ACTIVE,
      isDefault: true,
      width: 1600,
      height: 900,
    },
    create: {
      name: 'Main venue map',
      slug: 'main-venue',
      description: 'Main booking map for GorPliaj',
      status: MapStatus.ACTIVE,
      isDefault: true,
      width: 1600,
      height: 900,
    },
  });

  const zones = {
    beach: await upsertZone(map.id, {
      name: 'Beach',
      color: '#F4A261',
      sortOrder: 1,
    }),
    lounge: await upsertZone(map.id, {
      name: 'Lounge',
      color: '#2A9D8F',
      sortOrder: 2,
    }),
    vip: await upsertZone(map.id, {
      name: 'VIP',
      color: '#6A4C93',
      sortOrder: 3,
    }),
  };

  const tables = [
    { zoneKey: 'beach', name: 'Beach Table 1', code: 'B-01', seatsMin: 2, seatsMax: 4, deposit: '500.00', x: 140, y: 640 },
    { zoneKey: 'beach', name: 'Beach Table 2', code: 'B-02', seatsMin: 2, seatsMax: 4, deposit: '500.00', x: 300, y: 640 },
    { zoneKey: 'beach', name: 'Beach Family', code: 'B-03', seatsMin: 4, seatsMax: 6, deposit: '700.00', x: 470, y: 640 },
    { zoneKey: 'lounge', name: 'Lounge Corner', code: 'L-01', seatsMin: 2, seatsMax: 4, deposit: '600.00', x: 640, y: 470 },
    { zoneKey: 'lounge', name: 'Lounge Center', code: 'L-02', seatsMin: 4, seatsMax: 6, deposit: '800.00', x: 820, y: 470 },
    { zoneKey: 'lounge', name: 'Lounge Sofa', code: 'L-03', seatsMin: 4, seatsMax: 8, deposit: '1000.00', x: 1000, y: 470 },
    { zoneKey: 'vip', name: 'VIP Gold 1', code: 'V-01', seatsMin: 4, seatsMax: 6, deposit: '1200.00', x: 1220, y: 240 },
    { zoneKey: 'vip', name: 'VIP Gold 2', code: 'V-02', seatsMin: 4, seatsMax: 6, deposit: '1200.00', x: 1380, y: 240 },
    { zoneKey: 'vip', name: 'VIP Platinum', code: 'V-03', seatsMin: 6, seatsMax: 10, deposit: '1800.00', x: 1300, y: 420 },
  ];

  for (const table of tables) {
    const tableRecord = await upsertTable(map.id, zones[table.zoneKey].id, {
      name: table.name,
      code: table.code,
      seatsMin: table.seatsMin,
      seatsMax: table.seatsMax,
      deposit: table.deposit,
      isActive: true,
      isBookable: true,
    });

    await upsertMapObject(map.id, {
      tableId: tableRecord.id,
      type: MapObjectType.TABLE,
      label: table.code,
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
      label: 'Main Bar',
      x: 720,
      y: 120,
      width: 260,
      height: 90,
    },
    {
      type: MapObjectType.STAGE,
      label: 'Summer Stage',
      x: 300,
      y: 110,
      width: 280,
      height: 110,
    },
    {
      type: MapObjectType.ENTRANCE,
      label: 'Main Entrance',
      x: 40,
      y: 360,
      width: 100,
      height: 140,
    },
    {
      type: MapObjectType.WC,
      label: 'WC',
      x: 1460,
      y: 100,
      width: 90,
      height: 70,
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
