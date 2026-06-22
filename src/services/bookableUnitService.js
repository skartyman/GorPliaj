const { MapStatus } = require('@prisma/client');
const prisma = require('../lib/prisma');
const reservationService = require('./reservationService');
const venueTableOverrideService = require('./venueTableOverrideService');
const { localizeField, normalizeLocalizedField } = require('../utils/localization');
const EVENING_USAGE_KEYWORDS = ['night', 'evening', 'event', 'concert'];

function matchesRequestedUsageMode(mapUsageMode, requestedUsageMode) {
  const normalizedMapUsageMode = String(mapUsageMode || '').toUpperCase();
  const normalizedRequestedUsageMode = String(requestedUsageMode || '').toUpperCase();

  if (!normalizedRequestedUsageMode) {
    return true;
  }

  if (normalizedRequestedUsageMode === 'EVENING') {
    return normalizedMapUsageMode === 'EVENING' || normalizedMapUsageMode === 'EVENT';
  }

  return normalizedMapUsageMode === normalizedRequestedUsageMode;
}

function parseMeta(metaJson) {
  if (!metaJson) return {};
  if (typeof metaJson === 'object') return metaJson;
  try {
    return JSON.parse(metaJson);
  } catch {
    return {};
  }
}

function localizeJson(value) {
  if (!value || typeof value !== 'object') return String(value || '');
  return value.uk || value.ua || value.ru || value.en || '';
}

function normalizeLocalizedValue(value) {
  return normalizeLocalizedField(value);
}

function pickLocalizedValue(...values) {
  for (const value of values) {
    if (localizeField(value, 'ua')) {
      return normalizeLocalizedValue(value);
    }
  }

  return normalizeLocalizedValue('');
}

function buildPhotoGroupKey(table, objectMeta = {}) {
  const bookingKind = inferBookingKind(table, objectMeta);
  const positionType = String(table?.positionType || objectMeta.positionType || '').trim().toUpperCase();
  const localizedName = localizeField(
    pickLocalizedValue(table?.serviceName, table?.name, objectMeta.label || ''),
    'ua'
  ).toLowerCase();
  const seatsMax = Number(table?.seatsMax || objectMeta.capacityMax || table?.seatsMin || objectMeta.capacityMin || 0);

  if (bookingKind === 'BEACH') {
    if (positionType === 'BUNGALOW') return 'BEACH:BUNGALOW';
    if (positionType === 'KROVAT') return 'BEACH:KROVAT';
    if (positionType === 'PIER') return 'BEACH:PIER';
    return `BEACH:${positionType || 'DEFAULT'}`;
  }

  if (localizedName.includes('кальян')) return 'TABLE:HOOKAH';
  if (localizedName.includes('терас') || localizedName.includes('террас')) return 'TABLE:TERRACE';
  if (localizedName.includes('пірс') || localizedName.includes('пирс')) return 'TABLE:PIER';
  if (localizedName.includes('бунгало')) return 'TABLE:BUNGALOW';
  if (positionType === 'TERRACE') return 'TABLE:TERRACE';
  if (positionType === 'PIER') return 'TABLE:PIER';
  if (positionType === 'BUNGALOW') return 'TABLE:BUNGALOW';
  if (seatsMax >= 6) return 'TABLE:SEATS_6';
  if (seatsMax > 0) return `TABLE:SEATS_${seatsMax}`;
  return `TABLE:${positionType || 'DEFAULT'}`;
}

function inferMapUsageMode(map) {
  if (map?.usageMode) {
    return String(map.usageMode).toUpperCase();
  }

  const haystack = `${map.slug || ''} ${localizeJson(map.name)} ${localizeJson(map.description)}`.toLowerCase();
  return EVENING_USAGE_KEYWORDS.some((keyword) => haystack.includes(keyword)) ? 'EVENING' : 'DAY';
}

function inferBookingKind(table, objectMeta = {}) {
  if (table?.bookingKind) {
    return String(table.bookingKind).toUpperCase();
  }

  if (objectMeta.bookingKind === 'BEACH' || objectMeta.serviceKind === 'BEACH') {
    return 'BEACH';
  }

  return inferBeachKindFromPositionType(table.positionType);
}

function inferBeachKindFromPositionType(positionType) {
  // Fallback for old data without explicit bookingKind
  const BEACH_TYPES = new Set(['BUNGALOW', 'KROVAT', 'PIER']);
  return BEACH_TYPES.has(String(positionType || '').toUpperCase()) ? 'BEACH' : 'TABLE';
}

function getUnitPhotoUrl(table, objectMeta = {}) {
  return (
    table.photoUrl
    || objectMeta.photoUrl
    || objectMeta.imageUrl
    || objectMeta.assetUrl
    || objectMeta.svgUrl
    || null
  );
}

function buildBookableUnit(table, linkedObject) {
  const meta = parseMeta(linkedObject?.metaJson);
  const depositAmount = Number(table.deposit || meta.depositAmount || meta.deposit || 0);
  const bookingKind = inferBookingKind(table, meta);
  const seatsMin = Number(table.seatsMin || meta.capacityMin || 1);
  const seatsMax = Number(table.seatsMax || meta.capacityMax || seatsMin || 1);
  const photoGroupKey = buildPhotoGroupKey(table, meta);

  return {
    id: `table:${table.id}`,
    tableId: table.id,
    objectId: linkedObject?.id || null,
    mapId: table.mapId,
    zoneId: table.zoneId,
    bookingKind,
    positionType: table.positionType || linkedObject?.type || null,
    side: table.positionSide || null,
    rowId: table.rowId ? Number(table.rowId) : null,
    rowSortOrder: table.row?.sortOrder != null ? Number(table.row.sortOrder) : null,
    code: table.code || null,
    name: pickLocalizedValue(table.serviceName, table.name),
    label: pickLocalizedValue(linkedObject?.label, table.name),
    photoUrl: getUnitPhotoUrl(table, meta),
    seatsMin,
    seatsMax,
    capacityLabel: meta.capacityLabel || null,
    depositRequired: depositAmount > 0 || Boolean(meta.depositRequired),
    depositAmount: depositAmount > 0 ? depositAmount : 0,
    priceLabel: meta.price ? `${meta.price} ${meta.priceUnit || 'UAH'}` : null,
    features: Array.isArray(meta.features) ? meta.features : [],
    description: localizeField(table.serviceDescription, 'ua') || localizeField(meta.description, 'ua')
      ? pickLocalizedValue(table.serviceDescription, meta.description || '')
      : null,
    meta,
    photoGroupKey,
    isActive: table.isActive !== false,
    isBookable: table.isBookable !== false,
    sortOrder: Number(table.sortOrder || 0),
    status: 'free'
  };
}

function filterUnitForGuests(unit, guests) {
  const normalizedGuests = Number(guests || 0);
  if (!normalizedGuests) return true;
  return reservationService.matchesGuestCapacity(unit, normalizedGuests);
}

async function loadActiveMaps() {
  return prisma.map.findMany({
    where: {
      status: MapStatus.ACTIVE
    },
    include: {
      zones: {
        orderBy: { sortOrder: 'asc' }
      },
      tables: {
        where: {
          isActive: true
        },
        orderBy: { id: 'asc' }
      },
      mapObjects: {
        where: {
          isActive: true
        },
        orderBy: [{ zIndex: 'asc' }, { id: 'asc' }]
      }
    },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }]
  });
}

function buildUnitsFromMap(map) {
  const objectByTableId = new Map(
    map.mapObjects
      .filter((object) => object.tableId)
      .map((object) => [object.tableId, object])
  );

  const units = map.tables
    .map((table) => buildBookableUnit(table, objectByTableId.get(table.id)))
    .map((unit, _, allUnits) => {
      if (unit.photoUrl || !unit.photoGroupKey) {
        return unit;
      }

      const representative = allUnits.find((candidate) => candidate.photoGroupKey === unit.photoGroupKey && candidate.photoUrl);
      return {
        ...unit,
        photoUrl: representative?.photoUrl || null
      };
    })
    .map(({ photoGroupKey, ...unit }) => unit)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return String(left.code || left.id).localeCompare(String(right.code || right.id));
    });

  return units;
}

async function listPublicBookingMaps({ usageMode, bookingKind, guests }) {
  const maps = await loadActiveMaps();

  return maps
    .map((map) => {
      const units = buildUnitsFromMap(map).filter((unit) => {
        if (bookingKind && unit.bookingKind !== bookingKind) return false;
        return filterUnitForGuests(unit, guests);
      });

      return {
        id: map.id,
        slug: map.slug,
        name: normalizeLocalizedValue(map.name),
        description: map.description,
        width: map.width,
        height: map.height,
        backgroundImage: map.backgroundImage || null,
        backgroundColor: map.backgroundColor || null,
        isDefault: Boolean(map.isDefault),
        usageMode: inferMapUsageMode(map),
        unitCounts: {
          total: units.length,
          table: units.filter((unit) => unit.bookingKind === 'TABLE').length,
          beach: units.filter((unit) => unit.bookingKind === 'BEACH').length
        },
        zones: map.zones.map((zone) => ({
          id: zone.id,
          name: normalizeLocalizedValue(zone.name),
          color: zone.color,
          sortOrder: zone.sortOrder,
          unitCount: units.filter((unit) => unit.zoneId === zone.id).length
        }))
      };
    })
    .filter((map) => {
      if (!matchesRequestedUsageMode(map.usageMode, usageMode)) return false;
      return map.unitCounts.total > 0;
    });
}

async function getMapBookableUnits({ mapId, reservationDate, timeFrom, timeTo, guests, bookingKind, zoneId, eventId = null }) {
  const id = Number(mapId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const map = await prisma.map.findUnique({
    where: { id },
    include: {
      zones: {
        orderBy: { sortOrder: 'asc' }
      },
      tables: {
        where: {
          isActive: true
        },
        orderBy: { id: 'asc' },
        include: {
          row: { select: { sortOrder: true } }
        }
      },
      mapObjects: {
        where: {
          isActive: true
        },
        orderBy: [{ zIndex: 'asc' }, { id: 'asc' }]
      }
    }
  });

  if (!map) return null;

  const availability = await reservationService.getMapAvailability({
    mapId: id,
    reservationDate,
    timeFrom,
    timeTo
  });

  const overridesByTableId = await venueTableOverrideService.findApplicableOverrides({
    tableIds: map.tables.map((table) => table.id),
    reservationDate,
    eventId
  });
  const effectiveTables = map.tables.map((table) => venueTableOverrideService.applyOverrideToTable(table, overridesByTableId.get(table.id) || null));
  const effectiveMap = {
    ...map,
    tables: effectiveTables
  };

  const busy = new Set(availability.busyTableIds || []);
  const held = new Set(availability.heldTableIds || []);
  const units = buildUnitsFromMap(effectiveMap)
    .map((unit) => ({
      ...unit,
      status: !unit.isActive || !unit.isBookable
        ? 'unavailable'
        : busy.has(unit.tableId)
          ? 'busy'
          : held.has(unit.tableId)
            ? 'held'
            : 'free'
    }))
    .filter((unit) => {
      if (bookingKind && unit.bookingKind !== bookingKind) return false;
      if (zoneId && unit.zoneId !== Number(zoneId)) return false;
      return filterUnitForGuests(unit, guests);
    });

  return {
    map: {
      id: map.id,
      slug: map.slug,
      name: normalizeLocalizedValue(map.name),
      description: map.description,
      usageMode: inferMapUsageMode(map)
    },
    zones: map.zones.map((zone) => ({
      id: zone.id,
      name: normalizeLocalizedValue(zone.name),
      color: zone.color,
      sortOrder: zone.sortOrder,
      availableCount: units.filter((unit) => unit.zoneId === zone.id && unit.status === 'free').length,
      totalCount: units.filter((unit) => unit.zoneId === zone.id).length
    })),
    units
  };
}

async function getReservationUnit({ bookableUnitId, mapId, reservationDate = null, eventId = null }) {
  const [prefix, rawId] = String(bookableUnitId || '').split(':');
  if (prefix !== 'table') return null;

  const tableId = Number(rawId);
  const normalizedMapId = Number(mapId || 0);
  if (!Number.isInteger(tableId) || tableId <= 0) return null;

  const table = await prisma.venueTable.findFirst({
    where: {
      id: tableId,
      ...(normalizedMapId > 0 ? { mapId: normalizedMapId } : {})
    },
    include: {
      mapObjects: {
        where: {
          isActive: true
        },
        orderBy: [{ zIndex: 'asc' }, { id: 'asc' }],
        take: 1
      }
    }
  });

  if (!table) return null;

  const effectiveTable = await venueTableOverrideService.getEffectiveTable(table, {
    reservationDate,
    eventId
  });
  if (!effectiveTable?.isActive || !effectiveTable?.isBookable) {
    return null;
  }

  const unit = buildBookableUnit(effectiveTable, table.mapObjects[0] || null);
  return {
    ...unit,
    id: bookableUnitId
  };
}

module.exports = {
  getMapBookableUnits,
  getReservationUnit,
  inferMapUsageMode,
  listPublicBookingMaps
};
