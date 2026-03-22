const { PrismaClient, MapObjectType } = require('@prisma/client');

const prisma = new PrismaClient();

const EDITABLE_FIELDS = ['label', 'x', 'y', 'width', 'height', 'rotation', 'zIndex', 'isActive', 'tableId', 'type'];
const MAP_EDITABLE_FIELDS = ['backgroundImage', 'backgroundColor'];
const TABLE_EDITABLE_FIELDS = ['photoUrl'];
const VALID_OBJECT_TYPES = new Set(Object.values(MapObjectType));
const MAP_EDITOR_INCLUDE = {
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
};

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
    include: MAP_EDITOR_INCLUDE
  }).then(serializeMapEditorPayload);
}

function getDefaultAdminMapEditor() {
  return prisma.map.findFirst({
    where: {
      isDefault: true
    },
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'desc' }
    ],
    include: MAP_EDITOR_INCLUDE
  }).then(serializeMapEditorPayload);
}

function normalizeMapInput(mapInput) {
  const normalized = {};

  for (const field of MAP_EDITABLE_FIELDS) {
    if (field === 'backgroundImage' || field === 'backgroundColor') {
      normalized[field] = String(mapInput?.[field] ?? '').trim() || null;
    }
  }

  return normalized;
}

function normalizeTableInput(tableInput, existingTable = null) {
  const normalized = {};

  for (const field of TABLE_EDITABLE_FIELDS) {
    if (field === 'photoUrl') {
      normalized.photoUrl = String(tableInput?.photoUrl ?? existingTable?.photoUrl ?? '').trim() || null;
    }
  }

  return normalized;
}

function normalizeEditableObject(object, existingObject = null) {
  const normalized = {};

  for (const field of EDITABLE_FIELDS) {
    if (field === 'label') {
      normalized.label = object.label === null ? null : String(object.label ?? existingObject?.label ?? '').trim() || null;
      continue;
    }

    if (field === 'isActive') {
      normalized.isActive = object.isActive === undefined ? Boolean(existingObject?.isActive) : Boolean(object.isActive);
      continue;
    }

    if (field === 'zIndex') {
      normalized.zIndex = Number(object.zIndex ?? existingObject?.zIndex ?? 0);
      continue;
    }

    if (field === 'tableId') {
      const nextTableId = object.tableId === undefined ? existingObject?.tableId : object.tableId;
      normalized.tableId = nextTableId === null || nextTableId === '' || nextTableId === undefined ? null : Number(nextTableId);
      continue;
    }

    if (field === 'type') {
      normalized.type = String(object.type ?? existingObject?.type ?? '').trim().toUpperCase();
      continue;
    }

    normalized[field] = Number(object[field] ?? existingObject?.[field]);
  }

  if (normalized.type !== 'TABLE') {
    normalized.tableId = null;
  }

  return normalized;
}

function validateEditorObjects(objects) {
  if (!Array.isArray(objects)) {
    return 'Objects payload must be an array.';
  }

  const uniqueIds = new Set();

  for (const object of objects) {
    const rawId = object?.id;
    if (rawId === undefined || rawId === null || rawId === '') {
      return 'Each object must include an id.';
    }

    const normalizedId = String(rawId);
    if (uniqueIds.has(normalizedId)) {
      return 'Each object id must be unique.';
    }
    uniqueIds.add(normalizedId);

    const type = object.type === undefined || object.type === null ? '' : String(object.type).trim().toUpperCase();
    if (type && !VALID_OBJECT_TYPES.has(type)) {
      return `Object ${normalizedId} contains an invalid type.`;
    }

    const x = Number(object.x);
    const y = Number(object.y);
    const width = Number(object.width);
    const height = Number(object.height);
    const rotation = Number(object.rotation);
    const zIndex = Number(object.zIndex);

    if (![x, y, width, height, rotation, zIndex].every((value) => Number.isFinite(value))) {
      return `Object ${normalizedId} contains invalid numeric fields.`;
    }

    if (width <= 0 || height <= 0) {
      return `Object ${normalizedId} must have positive width and height.`;
    }

    if (object.tableId !== null && object.tableId !== '' && object.tableId !== undefined) {
      const tableId = Number(object.tableId);
      if (!Number.isInteger(tableId) || tableId <= 0) {
        return `Object ${normalizedId} contains an invalid table id.`;
      }

      if (type && type !== 'TABLE') {
        return `Only table objects can reference a table id (${normalizedId}).`;
      }
    }
  }

  return null;
}

function validateEditorTables(tables) {
  if (tables === undefined) {
    return null;
  }

  if (!Array.isArray(tables)) {
    return 'Tables payload must be an array.';
  }

  const uniqueIds = new Set();

  for (const table of tables) {
    const tableId = Number(table?.id);
    if (!Number.isInteger(tableId) || tableId <= 0) {
      return 'Each table must include a valid id.';
    }

    if (uniqueIds.has(tableId)) {
      return `Table ${tableId} is duplicated in payload.`;
    }
    uniqueIds.add(tableId);

    if (table.photoUrl !== undefined && table.photoUrl !== null && typeof table.photoUrl !== 'string') {
      return `Table ${tableId} contains an invalid photo URL.`;
    }
  }

  return null;
}

async function updateAdminMapEditor(mapId, objects, mapInput = {}, tablesInput = []) {
  const validationError = validateEditorObjects(objects) || validateEditorTables(tablesInput);
  if (validationError) {
    return { type: 'INVALID', message: validationError };
  }

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    select: {
      id: true,
      width: true,
      height: true,
      tables: {
        select: {
          id: true,
          photoUrl: true
        }
      }
    }
  });

  if (!map) {
    return { type: 'NOT_FOUND' };
  }

  const tableIds = new Set(map.tables.map((table) => table.id));
  const tablesById = new Map(map.tables.map((table) => [table.id, table]));
  const payloadTableIds = objects
    .map((object) => (object.tableId === null || object.tableId === '' || object.tableId === undefined ? null : Number(object.tableId)))
    .filter((tableId) => tableId !== null);

  if (payloadTableIds.some((tableId) => !tableIds.has(tableId))) {
    return { type: 'INVALID', message: 'Objects payload references an unknown table id.' };
  }

  if ((tablesInput || []).some((table) => !tableIds.has(Number(table.id)))) {
    return { type: 'INVALID', message: 'Tables payload references an unknown table id.' };
  }

  const existingObjects = await prisma.mapObject.findMany({
    where: { mapId },
    select: {
      id: true,
      mapId: true,
      tableId: true,
      type: true,
      label: true,
      x: true,
      y: true,
      width: true,
      height: true,
      rotation: true,
      zIndex: true,
      isActive: true,
      styleJson: true,
      metaJson: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  const existingById = new Map(existingObjects.map((object) => [object.id, object]));

  const payloadExistingIds = new Set();
  for (const object of objects) {
    const numericId = Number(object.id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      continue;
    }

    if (!existingById.has(numericId)) {
      return { type: 'INVALID', message: 'Objects payload contains an unknown map object id.' };
    }

    payloadExistingIds.add(numericId);
  }

  const mapUpdateData = normalizeMapInput(mapInput);
  const operations = [];

  if (Object.keys(mapUpdateData).length) {
    operations.push(
      prisma.map.update({
        where: { id: mapId },
        data: mapUpdateData
      })
    );
  }

  for (const table of tablesInput || []) {
    const tableId = Number(table.id);
    const normalizedTable = normalizeTableInput(table, tablesById.get(tableId));

    operations.push(
      prisma.venueTable.update({
        where: { id: tableId },
        data: normalizedTable
      })
    );
  }

  for (const existingObject of existingObjects) {
    if (payloadExistingIds.has(existingObject.id)) {
      continue;
    }

    operations.push(
      prisma.mapObject.delete({
        where: { id: existingObject.id }
      })
    );
  }

  for (const object of objects) {
    const numericId = Number(object.id);
    const isExistingObject = Number.isInteger(numericId) && numericId > 0;
    const normalizedObject = normalizeEditableObject(object, isExistingObject ? existingById.get(numericId) : null);

    if (!VALID_OBJECT_TYPES.has(normalizedObject.type)) {
      return { type: 'INVALID', message: `Object ${object.id} contains an invalid type.` };
    }

    if (normalizedObject.tableId !== null && !tableIds.has(normalizedObject.tableId)) {
      return { type: 'INVALID', message: 'Objects payload references an unknown table id.' };
    }

    if (normalizedObject.x < 0 || normalizedObject.y < 0 || normalizedObject.x > map.width || normalizedObject.y > map.height) {
      return { type: 'INVALID', message: `Object ${object.id} contains coordinates outside the map bounds.` };
    }

    if (isExistingObject) {
      operations.push(
        prisma.mapObject.update({
          where: { id: numericId },
          data: normalizedObject
        })
      );
      continue;
    }

    operations.push(
      prisma.mapObject.create({
        data: {
          mapId,
          ...normalizedObject,
          styleJson: object.styleJson ?? null,
          metaJson: object.metaJson ?? null
        }
      })
    );
  }

  if (operations.length) {
    await prisma.$transaction(operations);
  }

  const updatedMap = await getAdminMapEditor(mapId);
  return {
    type: 'UPDATED',
    data: updatedMap
  };
}

module.exports = {
  getAdminMapEditor,
  getDefaultAdminMapEditor,
  updateAdminMapEditor
};
