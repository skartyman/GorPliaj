const prisma = require('../lib/prisma');
const { normalizeLocalizedField } = require('../utils/localization');

const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'];

function getDayRange(value) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function normalizeRuleScope({ eventId, ruleDate }) {
  const normalizedEventId = Number(eventId || 0);
  const hasEventId = Number.isInteger(normalizedEventId) && normalizedEventId > 0;

  let normalizedRuleDate = null;
  if (ruleDate) {
    const parsed = new Date(ruleDate);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      normalizedRuleDate = parsed;
    }
  }

  if (hasEventId && normalizedRuleDate) {
    return { valid: false, message: 'Choose either an event or a date for the override scope.' };
  }

  if (!hasEventId && !normalizedRuleDate) {
    return { valid: false, message: 'Override scope requires an event or a date.' };
  }

  return {
    valid: true,
    eventId: hasEventId ? normalizedEventId : null,
    ruleDate: hasEventId ? null : normalizedRuleDate
  };
}

function normalizeOverridePayload(payload = {}) {
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'deposit')) {
    if (payload.deposit === '' || payload.deposit === null || payload.deposit === undefined) {
      normalized.deposit = null;
    } else {
      const deposit = Number(payload.deposit);
      if (!Number.isFinite(deposit) || deposit < 0) {
        return { valid: false, message: 'Deposit must be a non-negative number.' };
      }
      normalized.deposit = deposit;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isActive')) {
    normalized.isActive = payload.isActive === null || payload.isActive === undefined ? null : Boolean(payload.isActive);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isBookable')) {
    normalized.isBookable = payload.isBookable === null || payload.isBookable === undefined ? null : Boolean(payload.isBookable);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'photoUrl')) {
    normalized.photoUrl = String(payload.photoUrl || '').trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'note')) {
    normalized.note = String(payload.note || '').trim() || null;
  }

  return { valid: true, data: normalized };
}

function hasAnyOverrideValue(override) {
  return ['deposit', 'isActive', 'isBookable', 'photoUrl', 'note'].some((field) => override[field] !== null && override[field] !== undefined);
}

function serializeOverride(override) {
  if (!override) return null;

  return {
    id: override.id,
    tableId: override.tableId,
    eventId: override.eventId || null,
    ruleDate: override.ruleDate || null,
    deposit: override.deposit === null || override.deposit === undefined ? null : Number(override.deposit),
    isActive: override.isActive ?? null,
    isBookable: override.isBookable ?? null,
    photoUrl: override.photoUrl || null,
    note: override.note || '',
    createdAt: override.createdAt,
    updatedAt: override.updatedAt,
    event: override.event
      ? {
          id: override.event.id,
          title: normalizeLocalizedField(override.event.title),
          startAt: override.event.startAt
        }
      : null
  };
}

function applyOverrideToTable(table, override) {
  if (!table) return null;
  if (!override) return { ...table, effectiveOverride: null };

  return {
    ...table,
    deposit: override.deposit !== null && override.deposit !== undefined ? override.deposit : table.deposit,
    isActive: override.isActive !== null && override.isActive !== undefined ? override.isActive : table.isActive,
    isBookable: override.isBookable !== null && override.isBookable !== undefined ? override.isBookable : table.isBookable,
    photoUrl: override.photoUrl !== null && override.photoUrl !== undefined ? override.photoUrl : table.photoUrl,
    effectiveOverride: serializeOverride(override)
  };
}

async function findApplicableOverrides({ tableIds, reservationDate, eventId }) {
  const normalizedTableIds = [...new Set((tableIds || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
  if (!normalizedTableIds.length) {
    return new Map();
  }

  const orScopes = [];
  const normalizedEventId = Number(eventId || 0);
  if (Number.isInteger(normalizedEventId) && normalizedEventId > 0) {
    orScopes.push({ eventId: normalizedEventId });
  }

  if (reservationDate) {
    const { start, end } = getDayRange(reservationDate);
    orScopes.push({
      eventId: null,
      ruleDate: {
        gte: start,
        lt: end
      }
    });
  }

  if (!orScopes.length) {
    return new Map();
  }

  const overrides = await prisma.venueTableOverride.findMany({
    where: {
      tableId: {
        in: normalizedTableIds
      },
      OR: orScopes
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startAt: true
        }
      }
    },
    orderBy: [
      { eventId: 'desc' },
      { updatedAt: 'desc' },
      { id: 'desc' }
    ]
  });

  const byTableId = new Map();
  for (const override of overrides) {
    if (!byTableId.has(override.tableId)) {
      byTableId.set(override.tableId, override);
    }
  }

  return byTableId;
}

async function getEffectiveTable(table, scope = {}) {
  if (!table) return null;

  const overridesByTableId = await findApplicableOverrides({
    tableIds: [table.id],
    reservationDate: scope.reservationDate,
    eventId: scope.eventId
  });

  return applyOverrideToTable(table, overridesByTableId.get(table.id) || null);
}

async function updateTableBaseSettings({ tableId, patch }) {
  const id = Number(tableId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return { type: 'INVALID', message: 'Position id is invalid.' };
  }

  const data = {};

  if (Object.prototype.hasOwnProperty.call(patch, 'deposit')) {
    const deposit = Number(patch.deposit);
    if (!Number.isFinite(deposit) || deposit < 0) {
      return { type: 'INVALID', message: 'Deposit must be a non-negative number.' };
    }
    data.deposit = deposit;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'isActive')) {
    data.isActive = Boolean(patch.isActive);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'isBookable')) {
    data.isBookable = Boolean(patch.isBookable);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'photoUrl')) {
    data.photoUrl = String(patch.photoUrl || '').trim() || null;
  }

  if (!Object.keys(data).length) {
    return { type: 'INVALID', message: 'No editable fields were provided.' };
  }

  try {
    const table = await prisma.venueTable.update({
      where: { id },
      data,
      include: {
        map: { select: { id: true, name: true, usageMode: true } },
        zone: { select: { id: true, name: true, color: true } }
      }
    });

    return { type: 'UPDATED', table };
  } catch (error) {
    if (error.code === 'P2025') {
      return { type: 'NOT_FOUND', message: 'Position not found.' };
    }

    throw error;
  }
}

async function upsertTableOverride({ tableId, scope, patch }) {
  const id = Number(tableId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return { type: 'INVALID', message: 'Position id is invalid.' };
  }

  const normalizedScope = normalizeRuleScope(scope);
  if (!normalizedScope.valid) {
    return { type: 'INVALID', message: normalizedScope.message };
  }

  const normalizedPatch = normalizeOverridePayload(patch);
  if (!normalizedPatch.valid) {
    return { type: 'INVALID', message: normalizedPatch.message };
  }

  if (!hasAnyOverrideValue(normalizedPatch.data)) {
    return { type: 'INVALID', message: 'Override should contain at least one value.' };
  }

  const table = await prisma.venueTable.findUnique({
    where: { id },
    select: { id: true }
  });
  if (!table) {
    return { type: 'NOT_FOUND', message: 'Position not found.' };
  }

  const where = normalizedScope.eventId
    ? { tableId: id, eventId: normalizedScope.eventId }
    : {
        tableId: id,
        eventId: null,
        ruleDate: normalizedScope.ruleDate
      };

  const existing = await prisma.venueTableOverride.findFirst({
    where,
    select: { id: true }
  });

  const override = existing
    ? await prisma.venueTableOverride.update({
        where: { id: existing.id },
        data: normalizedPatch.data,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true
            }
          }
        }
      })
    : await prisma.venueTableOverride.create({
        data: {
          tableId: id,
          eventId: normalizedScope.eventId,
          ruleDate: normalizedScope.ruleDate,
          ...normalizedPatch.data
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true
            }
          }
        }
      });

  return { type: existing ? 'UPDATED' : 'CREATED', override };
}

async function deleteTableOverride({ tableId, scope }) {
  const id = Number(tableId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return { type: 'INVALID', message: 'Position id is invalid.' };
  }

  const normalizedScope = normalizeRuleScope(scope);
  if (!normalizedScope.valid) {
    return { type: 'INVALID', message: normalizedScope.message };
  }

  const existing = await prisma.venueTableOverride.findFirst({
    where: normalizedScope.eventId
      ? { tableId: id, eventId: normalizedScope.eventId }
      : { tableId: id, eventId: null, ruleDate: normalizedScope.ruleDate },
    select: { id: true }
  });

  if (!existing) {
    return { type: 'NOT_FOUND', message: 'Override not found.' };
  }

  await prisma.venueTableOverride.delete({
    where: { id: existing.id }
  });

  return { type: 'DELETED' };
}

async function listReservationPositionsManagement({
  reservationDate,
  eventId,
  mapId,
  zoneId,
  search
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedEventId = Number(eventId || 0) || null;

  const events = await prisma.event.findMany({
    where: {
      status: {
        in: ['DRAFT', 'PUBLISHED']
      }
    },
    orderBy: [
      { startAt: 'asc' },
      { id: 'asc' }
    ],
    select: {
      id: true,
      title: true,
      startAt: true,
      preferredMapUsageMode: true,
      status: true
    }
  });

  const selectedEvent = normalizedEventId
    ? events.find((event) => event.id === normalizedEventId) || null
    : null;

  const effectiveDate = reservationDate
    ? new Date(`${reservationDate}T00:00:00`)
    : (selectedEvent?.startAt ? new Date(selectedEvent.startAt) : today);
  effectiveDate.setHours(0, 0, 0, 0);

  const maps = await prisma.map.findMany({
    where: mapId ? { id: Number(mapId) } : undefined,
    orderBy: [
      { isDefault: 'desc' },
      { usageMode: 'asc' },
      { id: 'asc' }
    ],
    include: {
      zones: {
        orderBy: [
          { sortOrder: 'asc' },
          { id: 'asc' }
        ]
      },
      tables: {
        where: zoneId ? { zoneId: Number(zoneId) } : undefined,
        orderBy: [
          { sortOrder: 'asc' },
          { id: 'asc' }
        ]
      }
    }
  });

  const tableIds = maps.flatMap((map) => map.tables.map((table) => table.id));
  const overridesByTableId = await findApplicableOverrides({
    tableIds,
    reservationDate: effectiveDate,
    eventId: normalizedEventId
  });

  const { start, end } = getDayRange(effectiveDate);
  const reservations = tableIds.length
    ? await prisma.reservation.findMany({
        where: {
          tableId: {
            in: tableIds
          },
          reservationDate: {
            gte: start,
            lt: end
          },
          ...(normalizedEventId ? { eventId: normalizedEventId } : {}),
          status: {
            in: ACTIVE_RESERVATION_STATUSES
          }
        },
        select: {
          id: true,
          tableId: true,
          status: true,
          customerName: true,
          reservationDate: true,
          timeFrom: true
        },
        orderBy: [
          { timeFrom: 'asc' },
          { id: 'asc' }
        ]
      })
    : [];

  const reservationsByTableId = new Map();
  for (const reservation of reservations) {
    if (!reservationsByTableId.has(reservation.tableId)) {
      reservationsByTableId.set(reservation.tableId, []);
    }
    reservationsByTableId.get(reservation.tableId).push(reservation);
  }

  const normalizedSearch = String(search || '').trim().toLowerCase();

  const positions = maps.flatMap((map) => {
    const zonesById = new Map(map.zones.map((zone) => [zone.id, zone]));

    return map.tables
      .map((table) => {
        const override = overridesByTableId.get(table.id) || null;
        const effectiveTable = applyOverrideToTable(table, override);
        const tableReservations = reservationsByTableId.get(table.id) || [];
        const zone = zonesById.get(table.zoneId) || null;

        return {
          id: table.id,
          code: table.code || null,
          bookingKind: table.bookingKind,
          positionType: table.positionType,
          seatsMin: table.seatsMin,
          seatsMax: table.seatsMax,
          map: {
            id: map.id,
            name: normalizeLocalizedField(map.name),
            usageMode: map.usageMode,
            isDefault: Boolean(map.isDefault)
          },
          zone: zone
            ? {
                id: zone.id,
                name: normalizeLocalizedField(zone.name),
                color: zone.color
              }
            : null,
          name: normalizeLocalizedField(table.name),
          serviceName: normalizeLocalizedField(table.serviceName),
          base: {
            deposit: Number(table.deposit || 0),
            isActive: Boolean(table.isActive),
            isBookable: Boolean(table.isBookable),
            photoUrl: table.photoUrl || null
          },
          effective: {
            deposit: Number(effectiveTable.deposit || 0),
            isActive: Boolean(effectiveTable.isActive),
            isBookable: Boolean(effectiveTable.isBookable),
            photoUrl: effectiveTable.photoUrl || null
          },
          override: serializeOverride(override),
          reservationStats: {
            activeCount: tableReservations.length,
            confirmedCount: tableReservations.filter((reservation) => reservation.status === 'CONFIRMED').length,
            pendingCount: tableReservations.filter((reservation) => reservation.status === 'PENDING').length,
            latestReservation: tableReservations[0] || null
          }
        };
      })
      .filter((position) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          position.code,
          position.bookingKind,
          position.positionType,
          position.map.name.ua,
          position.map.name.ru,
          position.map.name.en,
          position.zone?.name?.ua,
          position.zone?.name?.ru,
          position.zone?.name?.en,
          position.name.ua,
          position.name.ru,
          position.name.en,
          position.serviceName.ua,
          position.serviceName.ru,
          position.serviceName.en
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      });
  });

  return {
    scope: {
      reservationDate: effectiveDate.toISOString().slice(0, 10),
      eventId: selectedEvent?.id || null
    },
    events: events.map((event) => ({
      id: event.id,
      title: normalizeLocalizedField(event.title),
      startAt: event.startAt,
      preferredMapUsageMode: event.preferredMapUsageMode || null,
      status: event.status
    })),
    maps: maps.map((map) => ({
      id: map.id,
      name: normalizeLocalizedField(map.name),
      usageMode: map.usageMode,
      isDefault: Boolean(map.isDefault),
      zones: map.zones.map((zone) => ({
        id: zone.id,
        name: normalizeLocalizedField(zone.name),
        color: zone.color
      }))
    })),
    positions
  };
}

module.exports = {
  applyOverrideToTable,
  deleteTableOverride,
  findApplicableOverrides,
  getEffectiveTable,
  listReservationPositionsManagement,
  updateTableBaseSettings,
  upsertTableOverride
};
