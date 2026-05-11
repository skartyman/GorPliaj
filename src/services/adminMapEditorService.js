const { PrismaClient, MapObjectType } = require('@prisma/client');

const prisma = new PrismaClient();

const EDITABLE_FIELDS = ['label', 'x', 'y', 'width', 'height', 'rotation', 'zIndex', 'isActive', 'tableId', 'type', 'styleJson', 'metaJson'];
const MAP_EDITABLE_FIELDS = ['width', 'height', 'backgroundImage', 'backgroundColor'];
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
const MAP_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  isDefault: true,
  width: true,
  height: true,
  updatedAt: true
};

const AUTOINCREMENT_TABLES = ['Map', 'Zone', 'VenueTable', 'MapObject'];

async function syncAutoincrementSequences(tx) {
  for (const tableName of AUTOINCREMENT_TABLES) {
    await tx.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"${tableName}"', 'id'),
        COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1,
        false
      )
    `);
  }
}

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

function listAdminMaps() {
  return prisma.map.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' },
      { id: 'desc' }
    ],
    select: MAP_LIST_SELECT
  });
}

async function createAdminMapVariant({ name, slug, description, sourceMapId = null, makeDefault = false }) {
  const normalizedName = String(name || '').trim();
  const normalizedSlug = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const normalizedDescription = String(description || '').trim() || null;

  if (!normalizedName) {
    return { type: 'INVALID', message: 'Map name is required.' };
  }

  if (!normalizedSlug) {
    return { type: 'INVALID', message: 'Map slug is required and may include only latin symbols, digits, and hyphens.' };
  }

  const existingBySlug = await prisma.map.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true }
  });
  if (existingBySlug) {
    return { type: 'CONFLICT', message: 'Map slug already exists.' };
  }

  const sourceMap = sourceMapId
    ? await prisma.map.findUnique({
        where: { id: Number(sourceMapId) },
        include: {
          zones: {
            orderBy: { sortOrder: 'asc' }
          },
          tables: {
            orderBy: { id: 'asc' }
          },
          mapObjects: {
            orderBy: { id: 'asc' }
          }
        }
      })
    : await prisma.map.findFirst({
        where: { isDefault: true },
        include: {
          zones: { orderBy: { sortOrder: 'asc' } },
          tables: { orderBy: { id: 'asc' } },
          mapObjects: { orderBy: { id: 'asc' } }
        }
      });

  if (!sourceMap) {
    return { type: 'NOT_FOUND', message: 'Source map for cloning is not found.' };
  }

  const createdMap = await prisma.$transaction(async (tx) => {
    await syncAutoincrementSequences(tx);

    if (makeDefault) {
      await tx.map.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const map = await tx.map.create({
      data: {
        name: normalizedName,
        slug: normalizedSlug,
        description: normalizedDescription,
        status: sourceMap.status,
        isDefault: Boolean(makeDefault),
        width: sourceMap.width,
        height: sourceMap.height,
        backgroundImage: sourceMap.backgroundImage,
        backgroundColor: sourceMap.backgroundColor
      }
    });

    const zoneIdMap = new Map();
    for (const zone of sourceMap.zones) {
      const createdZone = await tx.zone.create({
        data: {
          mapId: map.id,
          name: zone.name,
          color: zone.color,
          sortOrder: zone.sortOrder
        }
      });
      zoneIdMap.set(zone.id, createdZone.id);
    }

    const tableIdMap = new Map();
    for (const table of sourceMap.tables) {
      const createdTable = await tx.venueTable.create({
        data: {
          mapId: map.id,
          zoneId: zoneIdMap.get(table.zoneId),
          name: table.name,
          code: table.code,
          photoUrl: table.photoUrl,
          seatsMin: table.seatsMin,
          seatsMax: table.seatsMax,
          deposit: table.deposit,
          isActive: table.isActive,
          isBookable: table.isBookable
        }
      });
      tableIdMap.set(table.id, createdTable.id);
    }

    for (const object of sourceMap.mapObjects) {
      await tx.mapObject.create({
        data: {
          mapId: map.id,
          tableId: object.tableId ? tableIdMap.get(object.tableId) || null : null,
          type: object.type,
          label: object.label,
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
          rotation: object.rotation,
          zIndex: object.zIndex,
          styleJson: object.styleJson ?? null,
          metaJson: object.metaJson ?? null,
          isActive: object.isActive
        }
      });
    }

    return map;
  });

  const payload = await getAdminMapEditor(createdMap.id);
  return {
    type: 'CREATED',
    data: payload
  };
}

async function deleteAdminMapVariant(mapId) {
  const id = Number(mapId);
  if (!Number.isInteger(id) || id <= 0) {
    return { type: 'INVALID', message: 'Map id is invalid.' };
  }

  const map = await prisma.map.findUnique({
    where: { id },
    select: {
      id: true,
      isDefault: true,
      _count: {
        select: {
          reservations: true
        }
      }
    }
  });

  if (!map) {
    return { type: 'NOT_FOUND', message: 'Map not found.' };
  }

  if (map.isDefault) {
    return { type: 'INVALID', message: 'Default map cannot be deleted.' };
  }

  if (map._count.reservations > 0) {
    return { type: 'INVALID', message: 'Map with reservations cannot be deleted.' };
  }

  const mapCount = await prisma.map.count();
  if (mapCount <= 1) {
    return { type: 'INVALID', message: 'At least one map must remain.' };
  }

  await prisma.map.delete({ where: { id } });
  return { type: 'DELETED' };
}

function normalizeMapInput(mapInput) {
  const normalized = {};

  for (const field of MAP_EDITABLE_FIELDS) {
    if (field === 'width' || field === 'height') {
      const value = Number(mapInput?.[field]);
      if (Number.isFinite(value) && value >= 100) {
        normalized[field] = Math.round(value);
      }
      continue;
    }

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
      const nextLabel = object.label === undefined ? existingObject?.label : object.label;
      normalized.label = normalizeJsonValue(nextLabel);
      continue;
    }

    if (field === 'styleJson' || field === 'metaJson') {
      const nextValue = object[field] === undefined ? existingObject?.[field] : object[field];
      normalized[field] = normalizeJsonValue(nextValue);
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

function normalizeJsonValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'object') {
    return value;
  }

  return String(value).trim() || null;
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
  const hasNewObjects = objects.some((object) => {
    const numericId = Number(object.id);
    return !Number.isInteger(numericId) || numericId <= 0;
  });

  if (hasNewObjects) {
    await prisma.$executeRawUnsafe(
      'SELECT setval(pg_get_serial_sequence(\'"MapObject"\', \'id\'), COALESCE((SELECT MAX("id") FROM "MapObject"), 0) + 1, false)'
    );
  }

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
          ...normalizedObject
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
  listAdminMaps,
  createAdminMapVariant,
  deleteAdminMapVariant,
  getAdminMapEditor,
  getDefaultAdminMapEditor,
  updateAdminMapEditor
};
