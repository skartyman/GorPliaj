const crypto = require('crypto');
const prisma = require('../lib/prisma');
const venueTableOverrideService = require('./venueTableOverrideService');
const { localizeMessage } = require('../utils/localization');
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'];
const HOLD_TTL_MS = 15 * 60 * 1000;

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

function createReservation(payload) {
  const {
    tableId,
    mapId,
    zoneId,
    eventId,
    bookingKind,
    customerName,
    customerPhone,
    customerEmail,
    guests,
    reservationDate,
    timeFrom,
    timeTo,
    commentCustomer,
    commentAdmin,
    depositRequired,
    depositAmount,
    status,
    source,
    ticketCode
  } = payload;

  return prisma.reservation.create({
    data: {
      tableId,
      mapId,
      zoneId,
      eventId: eventId || null,
      bookingKind: bookingKind || undefined,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      guests,
      reservationDate,
      timeFrom,
      timeTo,
      commentCustomer: commentCustomer || null,
      commentAdmin: commentAdmin || null,
      depositRequired: Boolean(depositRequired),
      depositAmount: depositAmount === null || depositAmount === undefined || depositAmount === '' ? null : depositAmount,
      status: status || undefined,
      source: source || undefined,
      ticketCode: ticketCode || undefined
    },
    include: {
      table: { select: { id: true, code: true, name: true, serviceName: true, bookingKind: true, positionType: true, deposit: true, rowId: true, row: { select: { sortOrder: true } } } },
      zone: { select: { id: true, name: true } },
      event: { select: { id: true, slug: true, title: true, startAt: true } },
      payment: true
    }
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

function getPublicReservationByTicketCode(ticketCode) {
  return prisma.reservation.findUnique({
    where: { ticketCode },
    include: {
      table: { select: { id: true, code: true, name: true, serviceName: true, bookingKind: true, positionType: true, rowId: true, row: { select: { sortOrder: true } } } },
      zone: { select: { id: true, name: true } },
      event: { select: { id: true, slug: true, title: true, startAt: true } },
      payment: true
    }
  });
}

function getDateRange(date) {
  const start = new Date(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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

module.exports = {
  getReservations,
  createReservation,
  getReservationTable,
  getReservationObject,
  getPublicEventWithEntryTicket,
  getPublicReservationByTicketCode,
  matchesGuestCapacity,
  findReservationConflict,
  findTableHoldConflict,
  createTableHold,
  releaseTableHold,
  consumeTableHold,
  getMapAvailability,
  updateReservationStatus,
  deleteReservation
};
