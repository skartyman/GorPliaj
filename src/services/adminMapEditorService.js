const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EDITABLE_FIELDS = ['label', 'x', 'y', 'width', 'height', 'rotation', 'zIndex', 'isActive'];

function serializeMapEditorPayload(map) {
  if (!map) {
    return null;
  }

  const { zones, tables, mapObjects, ...mapData } = map;

  return {
    map: mapData,
    zones,
    tables,
    objects: mapObjects
  };
}

function getAdminMapEditor(mapId) {
  return prisma.map.findUnique({
    where: { id: mapId },
    include: {
      zones: {
        orderBy: {
          sortOrder: 'asc'
        }
      },
      tables: {
        orderBy: [
          { zoneId: 'asc' },
          { id: 'asc' }
        ]
      },
      mapObjects: {
        orderBy: [
          { zIndex: 'asc' },
          { id: 'asc' }
        ]
      }
    }
  }).then(serializeMapEditorPayload);
}

function normalizeEditableObject(object) {
  const normalized = {};

  for (const field of EDITABLE_FIELDS) {
    if (field === 'label') {
      normalized.label = object.label === null ? null : String(object.label ?? '').trim() || null;
      continue;
    }

    if (field === 'isActive') {
      normalized.isActive = Boolean(object.isActive);
      continue;
    }

    if (field === 'zIndex') {
      normalized.zIndex = Number(object.zIndex);
      continue;
    }

    normalized[field] = Number(object[field]);
  }

  return normalized;
}

function validateEditorObjects(objects) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return 'Objects payload must be a non-empty array.';
  }

  for (const object of objects) {
    const id = Number(object?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return 'Each object must include a valid id.';
    }

    const x = Number(object.x);
    const y = Number(object.y);
    const width = Number(object.width);
    const height = Number(object.height);
    const rotation = Number(object.rotation);
    const zIndex = Number(object.zIndex);

    if (![x, y, width, height, rotation, zIndex].every((value) => Number.isFinite(value))) {
      return `Object ${id} contains invalid numeric fields.`;
    }

    if (width <= 0 || height <= 0) {
      return `Object ${id} must have positive width and height.`;
    }
  }

  return null;
}

async function updateAdminMapEditor(mapId, objects) {
  const validationError = validateEditorObjects(objects);
  if (validationError) {
    return { type: 'INVALID', message: validationError };
  }

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    select: { id: true }
  });

  if (!map) {
    return { type: 'NOT_FOUND' };
  }

  const existingObjects = await prisma.mapObject.findMany({
    where: { mapId },
    select: {
      id: true,
      mapId: true,
      tableId: true,
      type: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  if (!existingObjects.length) {
    return { type: 'INVALID', message: 'Map has no editable objects.' };
  }

  const existingIds = new Set(existingObjects.map((object) => object.id));
  const payloadIds = objects.map((object) => Number(object.id));
  const uniquePayloadIds = new Set(payloadIds);

  if (uniquePayloadIds.size !== objects.length) {
    return { type: 'INVALID', message: 'Each object id must be unique.' };
  }

  if (payloadIds.length !== existingObjects.length) {
    return { type: 'INVALID', message: 'Full object list is required for saving.' };
  }

  if (payloadIds.some((id) => !existingIds.has(id))) {
    return { type: 'INVALID', message: 'Objects payload contains an unknown map object id.' };
  }

  const payloadById = new Map(objects.map((object) => [Number(object.id), object]));

  await prisma.$transaction(
    existingObjects.map((existingObject) => {
      const payload = payloadById.get(existingObject.id);
      return prisma.mapObject.update({
        where: { id: existingObject.id },
        data: normalizeEditableObject(payload)
      });
    })
  );

  const updatedMap = await getAdminMapEditor(mapId);
  return {
    type: 'UPDATED',
    data: updatedMap
  };
}

module.exports = {
  getAdminMapEditor,
  updateAdminMapEditor
};
