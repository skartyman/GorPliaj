const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'];

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
    customerName,
    customerPhone,
    guests,
    reservationDate,
    timeFrom,
    timeTo,
    commentCustomer
  } = payload;

  return prisma.reservation.create({
    data: {
      tableId,
      mapId,
      zoneId,
      customerName,
      customerPhone,
      guests,
      reservationDate,
      timeFrom,
      timeTo,
      commentCustomer: commentCustomer || null
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
  findReservationConflict,
  getMapAvailability,
  updateReservationStatus,
  deleteReservation
};
