const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED']
};

function getAdminReservations() {
  return prisma.reservation.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      table: {
        select: {
          id: true,
          name: true,
          code: true
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
          seatsMin: true,
          seatsMax: true
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
      table: {
        select: {
          id: true,
          name: true,
          code: true
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

  return { type: 'UPDATED', reservation };
}

module.exports = {
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus,
  getAllowedNextStatuses
};
