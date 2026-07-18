const prisma = require('../lib/prisma');

const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SEATED', 'CANCELLED', 'COMPLETED'],
  SEATED: ['COMPLETED', 'NO_SHOW']
};

function getAdminReservations() {
  return prisma.reservation.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      map: {
        select: {
          id: true,
          name: true,
          slug: true,
          usageMode: true
        }
      },
      table: {
        select: {
          id: true,
          name: true,
          code: true,
          bookingKind: true,
          positionType: true,
          photoUrl: true,
          serviceName: true,
          serviceDescription: true,
          seatsMin: true,
          seatsMax: true,
          deposit: true,
          price: true
        }
      },
      zone: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}

function getAdminReservationById(id) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      table: {
        select: {
          id: true,
          name: true,
          code: true,
          bookingKind: true,
          positionType: true,
          photoUrl: true,
          serviceName: true,
          serviceDescription: true,
          seatsMin: true,
          seatsMax: true,
          deposit: true
        }
      },
      zone: {
        select: {
          id: true,
          name: true,
          color: true
        }
      },
      map: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });
}

function getAllowedNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

async function updateAdminReservationStatus({ id, status }) {
  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true
    }
  });

  if (!existing) {
    return { type: 'NOT_FOUND' };
  }

  if (existing.status === status) {
    return { type: 'NO_OP', reservation: existing };
  }

  const allowedStatuses = getAllowedNextStatuses(existing.status);
  if (!allowedStatuses.includes(status)) {
    return {
      type: 'INVALID_TRANSITION',
      currentStatus: existing.status,
      allowedStatuses
    };
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status },
    include: {
      map: {
        select: {
          id: true,
          name: true,
          slug: true,
          usageMode: true
        }
      },
      table: {
        select: {
          id: true,
          name: true,
          code: true,
          bookingKind: true,
          positionType: true,
          photoUrl: true,
          serviceName: true,
          serviceDescription: true,
          seatsMin: true,
          seatsMax: true,
          deposit: true
        }
      },
      zone: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  await prisma.reservationLog.create({
    data: {
      reservationId: existing.id,
      action: 'ADMIN_STATUS_CHANGE',
      oldStatus: existing.status,
      newStatus: status,
      comment: 'Changed from admin panel'
    }
  });

  if (['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
    const analytics = require('./analyticsService');
    analytics.capture('booking_status_changed', {
      from: existing.status,
      to: status,
      bookingKind: reservation.table?.bookingKind || null,
      zoneId: reservation.zone?.id || null,
      reservationId: reservation.id
    }, reservation.analyticsDistinctId || 'server');
  }

  return { type: 'UPDATED', reservation };
}

async function deleteAdminReservation(id) {
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
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus,
  getAllowedNextStatuses,
  deleteAdminReservation
};
