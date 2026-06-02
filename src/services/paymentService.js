const prisma = require('../lib/prisma');

function toAdminPayment(payment) {
  return {
    id: payment.id,
    reservationId: payment.reservationId,
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
      }
    }
  });
  return payment ? toAdminPayment(payment) : null;
}

async function updatePaymentStatus(id, status) {
  const existing = await prisma.payment.findUnique({ where: { id } });
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
      }
    }
  });

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
