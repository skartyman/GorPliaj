const prisma = require('../lib/prisma');

function toAdminPayment(payment) {
  return {
    id: payment.id,
    reservationId: payment.reservationId,
    ticketOrderId: payment.ticketOrderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    providerOrderId: payment.providerOrderId,
    paymentUrl: payment.paymentUrl,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    rawPayload: payment.rawPayload,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    reservation: payment.reservation ? {
      id: payment.reservation.id,
      customerName: payment.reservation.customerName,
      customerPhone: payment.reservation.customerPhone,
      reservationDate: payment.reservation.reservationDate,
      timeFrom: payment.reservation.timeFrom,
      status: payment.reservation.status,
      guests: payment.reservation.guests
    } : null,
    ticketOrder: payment.ticketOrder ? {
      id: payment.ticketOrder.id,
      orderNumber: payment.ticketOrder.orderNumber,
      customerName: payment.ticketOrder.customerName,
      customerEmail: payment.ticketOrder.customerEmail,
      customerPhone: payment.ticketOrder.customerPhone,
      amount: Number(payment.ticketOrder.amount),
      status: payment.ticketOrder.status,
      event: payment.ticketOrder.event ? {
        id: payment.ticketOrder.event.id,
        title: payment.ticketOrder.event.title,
        slug: payment.ticketOrder.event.slug,
        startAt: payment.ticketOrder.event.startAt
      } : null
    } : null
  };
}

async function listAdminPayments() {
  const payments = await prisma.payment.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      reservation: {
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          reservationDate: true,
          timeFrom: true,
          status: true,
          guests: true
        }
      },
      ticketOrder: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          amount: true,
          status: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startAt: true
            }
          }
        }
      }
    }
  });
  return payments.map(toAdminPayment);
}

async function getAdminPaymentById(id) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      reservation: {
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          reservationDate: true,
          timeFrom: true,
          status: true,
          guests: true
        }
      },
      ticketOrder: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          amount: true,
          status: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startAt: true
            }
          }
        }
      }
    }
  });
  return payment ? toAdminPayment(payment) : null;
}

async function updatePaymentStatus(id, status) {
  const existing = await prisma.payment.findUnique({ 
    where: { id },
    include: { ticketOrder: true, reservation: true }
  });
  if (!existing) return { type: 'NOT_FOUND' };

  const VALID_STATUSES = ['PENDING', 'REQUIRES_ACTION', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'];
  if (!VALID_STATUSES.includes(status)) {
    return { type: 'INVALID', message: 'Invalid payment status.' };
  }

  const updateData = { status };
  if (status === 'PAID' && !existing.paidAt) {
    updateData.paidAt = new Date();
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: updateData,
    include: {
      reservation: {
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          reservationDate: true,
          timeFrom: true,
          status: true,
          guests: true
        }
      },
      ticketOrder: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          amount: true,
          status: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startAt: true
            }
          }
        }
      }
    }
  });

  // Trigger appropriate actions based on payment type and status
  if (payment.ticketOrderId && status === 'PAID') {
    // For ticket payments marked as PAID, update ticket order status
    const ticketSalesService = require('./ticketSalesService');
    await ticketSalesService.updateOrderStatus(payment.ticketOrderId, 'PAID');
  }
  else if (payment.reservationId && status === 'PAID') {
    // For reservation payments marked as PAID, update reservation status
    const reservation = await prisma.reservation.findUnique({
      where: { id: payment.reservationId },
      select: { bookingGroupId: true }
    });
    
    const confirmation = await prisma.reservation.updateMany({
      where: {
        ...(reservation?.bookingGroupId ? { bookingGroupId: reservation.bookingGroupId } : { id: payment.reservationId }),
        status: { in: ['PENDING', 'AWAITING_PAYMENT'] }
      },
      data: { status: 'CONFIRMED' }
    });
    
    if (confirmation.count > 0) {
      const hutkoService = require('./hutkoService');
      await hutkoService.notifyPaidReservation(payment.reservationId);
      await hutkoService.deliverPaidReservation(payment.reservationId, payment.amount);
    }
  }

  return { type: 'SUCCESS', payment: toAdminPayment(payment) };
}

function getPaygateConfig() {
  const merchantId = process.env.FONDY_MERCHANT_ID || '';
  const secretKey = process.env.FONDY_SECRET_KEY || '';
  return {
    provider: 'hutko',
    configured: !!(merchantId && secretKey),
    merchantId: merchantId ? `${merchantId.slice(0, 4)}...${merchantId.slice(-4)}` : null
  };
}

module.exports = {
  listAdminPayments,
  getAdminPaymentById,
  updatePaymentStatus,
  getPaygateConfig
};
