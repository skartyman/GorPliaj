const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
  updateReservationStatus,
  deleteReservation
};
