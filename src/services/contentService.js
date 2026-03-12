function getEvents() {
  return [];
}

function getNews() {
  return [];
}

async function getDefaultMap() {
  const { PrismaClient, MapStatus } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const map = await prisma.map.findFirst({
      where: {
        isDefault: true,
        status: MapStatus.ACTIVE,
      },
      include: {
        zones: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        tables: true,
        mapObjects: {
          orderBy: [
            {
              zIndex: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        },
      },
    });

    if (!map) {
      return null;
    }

    const { zones, tables, mapObjects, ...mapData } = map;

    return {
      map: mapData,
      zones,
      tables,
      objects: mapObjects,
    };
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  getEvents,
  getNews,
  getDefaultMap,
};
