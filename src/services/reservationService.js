const crypto = require('crypto');
const prisma = require('../lib/prisma');
const venueTableOverrideService = require('./venueTableOverrideService');
const { localizeMessage } = require('../utils/localization');
const { getClosingTimeString, getVenueClockParts, VENUE_UTC_OFFSET, VENUE_TIME_ZONE } = require('../utils/venueTime');
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SEATED'];
const HOLD_TTL_MS = 15 * 60 * 1000;
const BEACH_CLOSING_MINUTES = 20 * 60;

function matchesGuestCapacity(target, guests) {
  const normalizedGuests = Number(guests || 0);
  if (!Number.isFinite(normalizedGuests) || normalizedGuests <= 0) {
    return false;
  }

  const min = Number(target?.seatsMin || 1);
  const max = Number(target?.seatsMax || min || 1);
  const resolvedMax = Number.isFinite(max) && max > 0
    ? Math.max(max, Number.isFinite(min) && min > 0 ? min : 1)
    : (Number.isFinite(min) && min > 0 ? min : 1);

  return normalizedGuests <= resolvedMax;
}

function getReservations() {
  return prisma.reservation.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
}

function reservationCreateData(payload) {
  return {
    bookingGroupId: payload.bookingGroupId || null,
    isGroupLead: Boolean(payload.isGroupLead),
    groupGuestCount: payload.groupGuestCount || null,
    tableId: payload.tableId,
    mapId: payload.mapId,
    zoneId: payload.zoneId,
    eventId: payload.eventId || null,
    bookingKind: payload.bookingKind || undefined,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail || null,
    guests: payload.guests,
    reservationDate: payload.reservationDate,
    timeFrom: payload.timeFrom,
    timeTo: payload.timeTo,
    commentCustomer: payload.commentCustomer || null,
    commentAdmin: payload.commentAdmin || null,
    depositRequired: Boolean(payload.depositRequired),
    depositAmount: payload.depositAmount === null || payload.depositAmount === undefined || payload.depositAmount === '' ? null : payload.depositAmount,
    rentalAmount: payload.rentalAmount === null || payload.rentalAmount === undefined || payload.rentalAmount === '' ? null : payload.rentalAmount,
    paidInCash: Boolean(payload.paidInCash),
    status: payload.status || undefined,
    source: payload.source || undefined,
    ticketCode: payload.ticketCode || undefined,
    expiresAt: payload.expiresAt || null
  };
}

const reservationInclude = {
  table: { select: { id: true, code: true, name: true, serviceName: true, bookingKind: true, positionType: true, deposit: true, rowId: true, row: { select: { sortOrder: true } } } },
  zone: { select: { id: true, name: true } },
  event: { select: { id: true, slug: true, title: true, startAt: true } },
  payment: true
};

function createReservation(payload) {
  return prisma.reservation.create({
    data: reservationCreateData(payload),
    include: reservationInclude
  });
}

async function createReservationGroup(payloads) {
  if (!Array.isArray(payloads) || !payloads.length) {
    throw new Error('Reservation group requires at least one position.');
  }

  const created = await prisma.$transaction(payloads.map((payload) => prisma.reservation.create({
    data: reservationCreateData(payload),
    include: {
      table: { select: { id: true, code: true, name: true, serviceName: true, bookingKind: true, positionType: true, deposit: true } },
      zone: { select: { id: true, name: true } }
    }
  })));

  return prisma.reservation.findUnique({
    where: { id: created[0].id },
    include: reservationInclude
  });
}

async function getReservationTable({ tableId, mapId, zoneId, reservationDate = null, eventId = null }) {
  const table = await prisma.venueTable.findFirst({
    where: {
      id: tableId,
      mapId,
      zoneId
    },
    select: {
      id: true,
      code: true,
      name: true,
      serviceName: true,
      bookingKind: true,
      positionType: true,
      deposit: true,
      photoUrl: true,
      seatsMin: true,
      seatsMax: true,
      isActive: true,
      isBookable: true
    }
  });

  if (!table) {
    return null;
  }

  const effectiveTable = await venueTableOverrideService.getEffectiveTable(table, {
    reservationDate,
    eventId
  });

  if (!effectiveTable?.isActive || !effectiveTable?.isBookable) {
    return null;
  }

  return effectiveTable;
}

function getReservationObject({ objectId, mapId, tableId }) {
  return prisma.mapObject.findFirst({
    where: {
      id: objectId,
      mapId,
      tableId,
      isActive: true
    },
    select: {
      id: true,
      label: true,
      metaJson: true,
      tableId: true
    }
  });
}

function getPublicEventWithEntryTicket(slug) {
  return prisma.event.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
      ctaType: { in: ['TICKETS', 'BOTH'] }
    },
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      ticketTypes: {
        where: {
          isActive: true
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          capacity: true,
          soldCount: true,
          salesStart: true,
          salesEnd: true,
          eventSessionId: true,
          eventSession: {
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              isActive: true
            }
          }
        }
      }
    }
  });
}

async function getPublicReservationByTicketCode(ticketCode) {
  const reservation = await prisma.reservation.findUnique({
    where: { ticketCode },
    include: {
      table: { select: { id: true, code: true, name: true, serviceName: true, bookingKind: true, positionType: true, rowId: true, row: { select: { sortOrder: true } } } },
      zone: { select: { id: true, name: true } },
      event: { select: { id: true, slug: true, title: true, startAt: true } },
      payment: true
    }
  });
  if (!reservation?.bookingGroupId) return reservation;

  const groupReservations = await prisma.reservation.findMany({
    where: { bookingGroupId: reservation.bookingGroupId },
    orderBy: [{ isGroupLead: 'desc' }, { id: 'asc' }],
    include: {
      table: { select: { id: true, code: true, name: true, serviceName: true, bookingKind: true, positionType: true, rowId: true, row: { select: { sortOrder: true } } } },
      zone: { select: { id: true, name: true } },
      payment: true
    }
  });
  const leadPayment = groupReservations.find((item) => item.isGroupLead)?.payment || null;
  return { ...reservation, payment: reservation.payment || leadPayment, groupReservations };
}

function getDateRange(date) {
  const { dateKey } = getVenueClockParts(date instanceof Date ? date : new Date(date));
  const start = new Date(`${dateKey}T00:00:00${VENUE_UTC_OFFSET}`);
  const end = new Date(`${dateKey}T00:00:00${VENUE_UTC_OFFSET}`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getDateKeyRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00${VENUE_UTC_OFFSET}`);
  const end = new Date(`${dateKey}T00:00:00${VENUE_UTC_OFFSET}`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getVenueWeekdayKey(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TIME_ZONE,
    weekday: 'short'
  }).format(date).slice(0, 3).toLowerCase();
}

async function getConfiguredClosingTime(now) {
  const fallback = getClosingTimeString();
  const settings = await prisma.frontendSettings.findFirst({
    select: { workingHours: true }
  });
  const weekday = getVenueWeekdayKey(now);
  const configured = settings?.workingHours?.[weekday]?.close;
  return timeToMinutes(configured) === null ? fallback : configured;
}

async function findReservationConflict({ tableId, reservationDate, timeFrom, timeTo }) {
  const { start, end } = getDateRange(reservationDate);

  return prisma.reservation.findFirst({
    where: {
      tableId,
      reservationDate: {
        gte: start,
        lt: end
      },
      status: {
        in: ACTIVE_RESERVATION_STATUSES
      },
      timeFrom: {
        lt: timeTo
      },
      timeTo: {
        gt: timeFrom
      }
    },
    select: { id: true }
  });
}

async function findTableHoldConflict({ tableId, reservationDate, timeFrom, timeTo }) {
  const { start, end } = getDateRange(reservationDate);

  return prisma.tableHold.findFirst({
    where: {
      tableId,
      reservationDate: {
        gte: start,
        lt: end
      },
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      timeFrom: { lt: timeTo },
      timeTo: { gt: timeFrom }
    },
    select: { id: true, holdToken: true }
  });
}

async function createTableHold({ tableId, reservationDate, timeFrom, timeTo, locale }) {
  const existingReservation = await findReservationConflict({ tableId, reservationDate, timeFrom, timeTo });
  if (existingReservation) {
    const error = new Error(localizeMessage('hold.conflict.reservation', locale));
    error.statusCode = 409;
    throw error;
  }

  const existingHold = await findTableHoldConflict({ tableId, reservationDate, timeFrom, timeTo });
  if (existingHold) {
    const error = new Error(localizeMessage('hold.conflict.hold', locale));
    error.statusCode = 409;
    throw error;
  }

  const holdToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);

  const hold = await prisma.tableHold.create({
    data: {
      tableId,
      reservationDate,
      timeFrom,
      timeTo,
      holdToken,
      expiresAt,
      status: 'ACTIVE'
    }
  });

  return { holdToken, expiresAt: hold.expiresAt };
}

async function createTableHolds({ tableIds, reservationDate, timeFrom, timeTo, locale }) {
  const uniqueTableIds = [...new Set((tableIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!uniqueTableIds.length) {
    const error = new Error(localizeMessage('hold.invalid.params', locale));
    error.statusCode = 400;
    throw error;
  }

  const { start, end } = getDateRange(reservationDate);
  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingReservation = await tx.reservation.findFirst({
        where: {
          tableId: { in: uniqueTableIds },
          reservationDate: { gte: start, lt: end },
          status: { in: ACTIVE_RESERVATION_STATUSES },
          timeFrom: { lt: timeTo },
          timeTo: { gt: timeFrom }
        },
        select: { tableId: true }
      });
      if (existingReservation) {
        const error = new Error(localizeMessage('hold.conflict.reservation', locale));
        error.statusCode = 409;
        throw error;
      }

      const existingHold = await tx.tableHold.findFirst({
        where: {
          tableId: { in: uniqueTableIds },
          reservationDate: { gte: start, lt: end },
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
          timeFrom: { lt: timeTo },
          timeTo: { gt: timeFrom }
        },
        select: { tableId: true }
      });
      if (existingHold) {
        const error = new Error(localizeMessage('hold.conflict.hold', locale));
        error.statusCode = 409;
        throw error;
      }

      const holds = [];
      for (const tableId of uniqueTableIds) {
        const holdToken = crypto.randomUUID();
        await tx.tableHold.create({
          data: { tableId, reservationDate, timeFrom, timeTo, holdToken, expiresAt, status: 'ACTIVE' }
        });
        holds.push({ tableId, holdToken });
      }

      return { holds, holdToken: holds[0].holdToken, expiresAt };
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error?.code === 'P2034') {
      const conflict = new Error(localizeMessage('hold.conflict.hold', locale));
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }
}

async function releaseTableHold(holdToken) {
  try {
    await prisma.tableHold.updateMany({
      where: { holdToken, status: 'ACTIVE' },
      data: { status: 'RELEASED' }
    });
    return true;
  } catch {
    return false;
  }
}

async function consumeTableHold(holdToken, reservationId) {
  try {
    await prisma.tableHold.updateMany({
      where: { holdToken, status: 'ACTIVE' },
      data: { status: 'CONSUMED', reservationId }
    });
    return true;
  } catch {
    return false;
  }
}

async function getMapAvailability({ mapId, reservationDate, timeFrom, timeTo }) {
  const { start, end } = getDateRange(reservationDate);

  const tables = await prisma.venueTable.findMany({
    where: {
      mapId,
      isActive: true,
      isBookable: true
    },
    select: { id: true }
  });

  const [busyReservations, heldTables] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        mapId,
        reservationDate: {
          gte: start,
          lt: end
        },
        status: {
          in: ACTIVE_RESERVATION_STATUSES
        },
        timeFrom: {
          lt: timeTo
        },
        timeTo: {
          gt: timeFrom
        }
      },
      select: { tableId: true }
    }),
    prisma.tableHold.findMany({
      where: {
        table: { mapId },
        reservationDate: {
          gte: start,
          lt: end
        },
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date()
        },
        timeFrom: {
          lt: timeTo
        },
        timeTo: {
          gt: timeFrom
        }
      },
      select: { tableId: true }
    })
  ]);

  const busyTableIds = [...new Set(busyReservations.map((reservation) => reservation.tableId))];
  const heldTableIds = [...new Set(heldTables.map((hold) => hold.tableId))];
  const blockedTableIds = new Set([...busyTableIds, ...heldTableIds]);
  const freeTableIds = tables
    .map((table) => table.id)
    .filter((tableId) => !blockedTableIds.has(tableId));

  return {
    busyTableIds,
    heldTableIds,
    freeTableIds
  };
}

function updateReservationStatus(id, status) {
  return prisma.reservation.update({
    where: { id },
    data: { status }
  });
}

async function deleteReservation(id) {
  try {
    await prisma.reservation.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      return false;
    }

    throw error;
  }
}

async function expireStaleReservations() {
  try {
    const expired = await prisma.reservation.updateMany({
      where: {
        status: { in: ['PENDING', 'AWAITING_PAYMENT'] },
        expiresAt: { lt: new Date() }
      },
      data: { status: 'CANCELLED' }
    });
    if (expired.count > 0) {
      console.log(`[reservationService] Cancelled ${expired.count} stale reservations.`);
    }
  } catch (err) {
    console.error('[reservationService.expireStaleReservations] Failed.', err);
  }
}

async function cancelReservationAfterTicketFailure(reservationId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { bookingGroupId: true }
  });
  return prisma.reservation.updateMany({
    where: {
      ...(reservation?.bookingGroupId ? { bookingGroupId: reservation.bookingGroupId } : { id: reservationId }),
      status: { in: ['PENDING', 'AWAITING_PAYMENT'] }
    },
    data: { status: 'CANCELLED' }
  });
}

async function releaseMissedEventTables(now = new Date()) {
  const deadline = new Date(now.getTime() - 30 * 60 * 1000);
  const reservations = await prisma.reservation.findMany({
    where: {
      source: 'EVENT',
      eventId: { not: null },
      status: 'CONFIRMED',
      arrivedAt: null,
      timeFrom: { lte: deadline }
    },
    select: { id: true, status: true, timeFrom: true }
  });

  let released = 0;
  for (const reservation of reservations) {
    const result = await prisma.reservation.updateMany({
      where: { id: reservation.id, status: 'CONFIRMED', arrivedAt: null },
      data: { status: 'NO_SHOW' }
    });
    if (result.count !== 1) continue;
    released += 1;
    await prisma.reservationLog.create({
      data: {
        reservationId: reservation.id,
        action: 'AUTO_RELEASE_EVENT_TABLE_AFTER_30_MIN',
        oldStatus: reservation.status,
        newStatus: 'NO_SHOW',
        comment: 'Table guarantee expired 30 minutes after the selected arrival time. Event tickets remain valid.'
      }
    });
  }
  return released;
}

async function completeClosedDayReservations(now = new Date()) {
  try {
    const closingTime = await getConfiguredClosingTime(now);
    const closingMinutes = timeToMinutes(closingTime);
    if (closingMinutes === null) return 0;

    const venueNow = getVenueClockParts(now);
    const todayRange = getDateKeyRange(venueNow.dateKey);
    const dateFilters = [
      { reservationDate: { lt: todayRange.start } }
    ];

    if (venueNow.minutes >= BEACH_CLOSING_MINUTES) {
      dateFilters.push({
        bookingKind: 'BEACH',
        reservationDate: { gte: todayRange.start, lt: todayRange.end }
      });
    }

    if (venueNow.minutes >= closingMinutes) {
      dateFilters.push({
        bookingKind: 'TABLE',
        reservationDate: { gte: todayRange.start, lt: todayRange.end }
      });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        status: { in: ACTIVE_RESERVATION_STATUSES },
        OR: dateFilters
      },
      select: {
        id: true,
        status: true,
        bookingKind: true
      }
    });

    let completedCount = 0;
    for (const reservation of reservations) {
      const result = await prisma.reservation.updateMany({
        where: {
          id: reservation.id,
          status: { in: ACTIVE_RESERVATION_STATUSES }
        },
        data: { status: 'COMPLETED' }
      });

      if (result.count > 0) {
        completedCount += result.count;
        const isBeach = reservation.bookingKind === 'BEACH';
        const automaticClosingTime = isBeach ? '20:00' : closingTime;
        await prisma.reservationLog.create({
          data: {
            reservationId: reservation.id,
            action: isBeach ? 'AUTO_COMPLETE_BEACH_AT_20' : 'AUTO_COMPLETE_AT_CLOSING',
            oldStatus: reservation.status,
            newStatus: 'COMPLETED',
            comment: `Automatically completed at ${automaticClosingTime} (${VENUE_TIME_ZONE}).`
          }
        });
      }
    }

    if (completedCount > 0) {
      console.log(`[reservationService] Completed ${completedCount} reservations by automatic closing rules.`);
    }

    return completedCount;
  } catch (err) {
    console.error('[reservationService.completeClosedDayReservations] Failed.', err);
    return 0;
  }
}

module.exports = {
  getReservations,
  createReservation,
  createReservationGroup,
  getReservationTable,
  getReservationObject,
  getPublicEventWithEntryTicket,
  getPublicReservationByTicketCode,
  matchesGuestCapacity,
  findReservationConflict,
  findTableHoldConflict,
  createTableHold,
  createTableHolds,
  releaseTableHold,
  consumeTableHold,
  cancelReservationAfterTicketFailure,
  releaseMissedEventTables,
  expireStaleReservations,
  completeClosedDayReservations,
  getMapAvailability,
  updateReservationStatus,
  deleteReservation
};
