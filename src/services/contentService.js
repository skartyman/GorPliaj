const { MapStatus } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { fitMapToObjects } = require('../utils/mapBounds');

function getEvents() {
  return [];
}

async function getNews() {
  const { listPublicNews } = require('./newsService');
  return await listPublicNews();
}

async function getDefaultMap() {
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
    map: fitMapToObjects(mapData, mapObjects),
    zones,
    tables,
    objects: mapObjects,
  };
}

async function getMapById(mapId) {
  const id = Number(mapId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const map = await prisma.map.findUnique({
    where: { id },
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
    map: fitMapToObjects(mapData, mapObjects),
    zones,
    tables,
    objects: mapObjects,
  };
}

module.exports = {
  getEvents,
  getNews,
  getDefaultMap,
  getMapById,
};
