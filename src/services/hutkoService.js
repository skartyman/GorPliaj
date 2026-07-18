const https = require('https');
const prisma = require('../lib/prisma');
const hutkoUtils = require('../utils/hutko');
const { sendTicketEmail } = require('./emailService');
const { sendNewReservationMessage } = require('./waiterTelegramService');
const analytics = require('./analyticsService');
const {
  generateTicketSignature,
  buildVerifyUrl,
  buildReservationStatusUrl,
  buildReservationPdfUrl,
  buildDepositVerifyUrl
} = require('../utils/ticketSignature');

function localizedValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.ua || value.ru || value.en || '';
}

async function notifyPaidReservation(reservationId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      table: { select: { code: true, name: true, serviceName: true, bookingKind: true } },
      zone: { select: { name: true } },
      event: { select: { title: true } },
      payment: true
    }
  });
  if (!reservation) return;

  const groupReservations = reservation.bookingGroupId
    ? await prisma.reservation.findMany({
      where: { bookingGroupId: reservation.bookingGroupId },
      orderBy: [{ isGroupLead: 'desc' }, { id: 'asc' }],
      include: {
        table: { select: { code: true, name: true, serviceName: true } },
        zone: { select: { name: true } }
      }
    })
    : [reservation];

  await sendNewReservationMessage(reservation, {
    positions: groupReservations
      .map((item) => localizedValue(item.table?.serviceName) || localizedValue(item.table?.name) || item.table?.code)
      .filter(Boolean),
    zones: groupReservations.map((item) => localizedValue(item.zone?.name)).filter(Boolean),
    guests: Number(reservation.groupGuestCount || reservation.guests || 0),
    totalAmount: Number(reservation.payment?.amount || 0),
    currency: reservation.payment?.currency || 'UAH',
    isPaid: true,
    eventTitle: localizedValue(reservation.event?.title)
  });
}

async function deliverPaidReservation(reservationId, fallbackPaymentAmount = 0) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      table: { select: { name: true, serviceName: true, code: true } },
      zone: { select: { name: true } },
      event: { select: { title: true } },
      payment: true
    }
  });
  if (!reservation) return;

  const groupReservations = reservation.bookingGroupId
    ? await prisma.reservation.findMany({
      where: { bookingGroupId: reservation.bookingGroupId },
      orderBy: [{ isGroupLead: 'desc' }, { id: 'asc' }],
      include: {
        table: { select: { name: true, serviceName: true, code: true } },
        zone: { select: { name: true } }
      }
    })
    : [reservation];

  if (reservation.payment?.ticketOrderId) {
    const ticketSalesService = require('./ticketSalesService');
    await ticketSalesService.updateOrderStatus(reservation.payment.ticketOrderId, 'PAID');
  }
  if (!reservation.customerEmail) return;

  const totalGuests = Number(reservation.groupGuestCount || reservation.guests || 0);
  const tableName = groupReservations
    .map((item) => localizedValue(item.table?.serviceName) || localizedValue(item.table?.name) || item.table?.code || '')
    .filter(Boolean)
    .join(', ');
  const zoneName = [...new Set(groupReservations.map((item) => localizedValue(item.zone?.name)).filter(Boolean))].join(', ');
  const rentalAmt = groupReservations.reduce((sum, item) => sum + Number(item.rentalAmount || 0), 0);
  const depositAmt = groupReservations.reduce((sum, item) => sum + Number(item.depositAmount || 0), 0);
  const payAmt = Number(reservation.payment?.amount || fallbackPaymentAmount || 0);

  await sendTicketEmail({
    to: reservation.customerEmail,
    ticketCode: reservation.ticketCode,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone || '',
    reservationDate: reservation.reservationDate,
    timeFrom: reservation.timeFrom,
    timeTo: reservation.timeTo,
    guests: totalGuests,
    tableName,
    zoneName,
    eventTitle: reservation.event?.title || null,
    depositAmount: depositAmt,
    rentalAmount: rentalAmt,
    totalPaid: payAmt,
    entryTicketsAmount: Math.max(payAmt - rentalAmt - depositAmt, 0),
    verifyUrl: buildVerifyUrl(reservation.ticketCode, reservation.reservationDate),
    statusUrl: buildReservationStatusUrl(reservation.ticketCode, reservation.reservationDate),
    downloadUrl: buildReservationPdfUrl(reservation.ticketCode, reservation.reservationDate),
    depositQrUrl: depositAmt > 0
      ? buildDepositVerifyUrl(reservation.ticketCode, reservation.reservationDate)
      : null,
    status: 'PAID',
    paymentStatus: 'PAID'
  });
}

function postToHutko(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ request: data });
    const url = new URL(path, hutkoUtils.HUTKO_API_BASE);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          resolve({ response: { response_status: 'failure', error_message: 'Invalid JSON response' } });
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Hutko request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

function generateOrderId(reservationId) {
  return `GP-${reservationId}-${Date.now()}`;
}

function generateTicketPaymentOrderId(ticketOrderId) {
  return `GPT-${ticketOrderId}-${Date.now()}`;
}

function parseOrderId(orderId) {
  if (!orderId || typeof orderId !== 'string') return null;
  const parts = orderId.split('-');
  const id = parseInt(parts[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseTicketPaymentOrderId(orderId) {
  if (!orderId || typeof orderId !== 'string') return null;
  const match = orderId.match(/^GPT-(\d+)-/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const HUTKO_STATUS_MAP = {
  approved: 'PAID',
  declined: 'FAILED',
  pending: 'PENDING',
  processing: 'PENDING',
  expired: 'FAILED',
  reversed: 'REFUNDED',
  refunded: 'REFUNDED'
};

function mapHutkoStatus(hutkoStatus) {
  return HUTKO_STATUS_MAP[hutkoStatus] || 'PENDING';
}

async function applyTicketPaymentStatus({ ticketOrderId, providerOrderId, providerPaymentId, amount, currency = 'UAH', status, rawPayload }) {
  const ourStatus = mapHutkoStatus(status);
  const updateData = {
    ...(providerPaymentId ? { providerPaymentId: String(providerPaymentId) } : {}),
    status: ourStatus,
    currency,
    rawPayload
  };

  if (amount) {
    const parsedAmount = parseInt(amount, 10) / 100;
    if (!isNaN(parsedAmount)) {
      updateData.amount = parsedAmount;
    }
  }

  if (ourStatus === 'PAID') {
    updateData.paidAt = new Date();
  }

  const payment = await prisma.payment.upsert({
    where: { ticketOrderId },
    update: updateData,
    create: {
      ticketOrderId,
      provider: 'hutko',
      providerPaymentId: providerPaymentId ? String(providerPaymentId) : null,
      providerOrderId,
      amount: updateData.amount || 0,
      currency,
      status: ourStatus,
      rawPayload
    }
  });

  if (ourStatus === 'PAID') {
    const ticketSalesService = require('./ticketSalesService');
    await ticketSalesService.updateOrderStatus(ticketOrderId, 'PAID');
  }

  return payment;
}

async function createCheckoutSession({ reservationId, ticketOrderId = null, amount, description, currency = 'UAH', customerEmail, customerPhone, returnTo }) {
  const config = hutkoUtils.getConfig();
  if (!config.isConfigured) {
    return { type: 'NOT_CONFIGURED', message: 'Payment gateway is not configured. Set FONDY_MERCHANT_ID and FONDY_SECRET_KEY.' };
  }

  const orderId = generateOrderId(reservationId);
  const amountCents = Math.round(Number(amount) * 100);

  const existing = await prisma.payment.findUnique({ where: { reservationId } });
  if (existing) {
    if (existing.status === 'PAID') {
      return { type: 'ALREADY_PAID', message: 'This reservation is already paid.' };
    }
    if (existing.paymentUrl && ['PENDING', 'REQUIRES_ACTION'].includes(existing.status)) {
      return { type: 'EXISTS', paymentUrl: existing.paymentUrl, paymentId: existing.id };
    }
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const responseUrl = returnTo && String(returnTo).startsWith('/')
    ? `${appBaseUrl}/api/paygate/hutko/return/public?kind=reservation&return_to=${encodeURIComponent(returnTo)}`
    : `${appBaseUrl}/api/paygate/hutko/return`;

  const requestData = hutkoUtils.prepareRequest({
    order_id: orderId,
    order_desc: description || `Reservation #${reservationId}`,
    currency,
    amount: String(amountCents),
    response_url: responseUrl,
    server_callback_url: `${appBaseUrl}/api/paygate/hutko/callback`,
    ...(customerEmail ? { sender_email: customerEmail } : {}),
    ...(customerPhone ? { sender_phone: customerPhone } : {}),
    lifetime: 3600
  });

  const raw = await postToHutko('/api/checkout/url/', requestData);
  const parsed = hutkoUtils.parseResponse(raw);

  if (!parsed.success) {
    return { type: 'PROVIDER_ERROR', message: parsed.error, raw: parsed.raw };
  }

  const checkoutUrl = parsed.data.checkout_url;
  const providerPaymentId = parsed.data.payment_id ? String(parsed.data.payment_id) : null;

  const payment = await prisma.payment.upsert({
    where: { reservationId },
    update: {
      ticketOrderId,
      provider: 'hutko',
      providerPaymentId,
      providerOrderId: orderId,
      paymentUrl: checkoutUrl,
      amount,
      currency,
      status: 'PENDING',
      rawPayload: raw
    },
    create: {
      reservationId,
      ticketOrderId,
      provider: 'hutko',
      providerPaymentId,
      providerOrderId: orderId,
      paymentUrl: checkoutUrl,
      amount,
      currency,
      status: 'PENDING',
      rawPayload: raw
    }
  });

  return { type: 'SUCCESS', paymentUrl: checkoutUrl, paymentId: payment.id };
}

async function createTicketCheckoutSession({ ticketOrderId }) {
  const config = hutkoUtils.getConfig();
  if (!config.isConfigured) {
    return { type: 'NOT_CONFIGURED', message: 'Payment gateway is not configured. Set FONDY_MERCHANT_ID and FONDY_SECRET_KEY.' };
  }

  const ticketOrder = await prisma.ticketOrder.findUnique({
    where: { id: ticketOrderId },
    include: {
      event: { select: { title: true, slug: true } },
      payment: true
    }
  });
  if (!ticketOrder) return { type: 'NOT_FOUND', message: 'Ticket order not found.' };
  if (ticketOrder.status === 'PAID') {
    return { type: 'ALREADY_PAID', message: 'This ticket order is already paid.' };
  }
  if (ticketOrder.payment?.paymentUrl && ['PENDING', 'REQUIRES_ACTION'].includes(ticketOrder.payment.status)) {
    return { type: 'EXISTS', paymentUrl: ticketOrder.payment.paymentUrl, paymentId: ticketOrder.payment.id };
  }

  const orderId = generateTicketPaymentOrderId(ticketOrder.id);
  const amountCents = Math.round(Number(ticketOrder.amount) * 100);
  const appBaseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const returnPath = ticketOrder.event?.slug
    ? `/events/${encodeURIComponent(ticketOrder.event.slug)}?ticket_order=${encodeURIComponent(ticketOrder.orderNumber)}&token=${encodeURIComponent(ticketOrder.downloadToken)}`
    : `/events?ticket_order=${encodeURIComponent(ticketOrder.orderNumber)}&token=${encodeURIComponent(ticketOrder.downloadToken)}`;

  const requestData = hutkoUtils.prepareRequest({
    order_id: orderId,
    order_desc: `Tickets ${ticketOrder.orderNumber}`,
    currency: ticketOrder.currency,
    amount: String(amountCents),
    response_url: `${appBaseUrl}/api/paygate/hutko/return/public?kind=ticket&return_to=${encodeURIComponent(returnPath)}`,
    server_callback_url: `${appBaseUrl}/api/paygate/hutko/callback`,
    sender_email: ticketOrder.customerEmail,
    ...(ticketOrder.customerPhone ? { sender_phone: ticketOrder.customerPhone } : {}),
    lifetime: 1800
  });

  const raw = await postToHutko('/api/checkout/url/', requestData);
  const parsed = hutkoUtils.parseResponse(raw);

  if (!parsed.success) {
    return { type: 'PROVIDER_ERROR', message: parsed.error, raw: parsed.raw };
  }

  const checkoutUrl = parsed.data.checkout_url;
  const providerPaymentId = parsed.data.payment_id ? String(parsed.data.payment_id) : null;

  const payment = await prisma.payment.upsert({
    where: { ticketOrderId: ticketOrder.id },
    update: {
      provider: 'hutko',
      providerPaymentId,
      providerOrderId: orderId,
      paymentUrl: checkoutUrl,
      amount: ticketOrder.amount,
      currency: ticketOrder.currency,
      status: 'PENDING',
      rawPayload: raw
    },
    create: {
      ticketOrderId: ticketOrder.id,
      provider: 'hutko',
      providerPaymentId,
      providerOrderId: orderId,
      paymentUrl: checkoutUrl,
      amount: ticketOrder.amount,
      currency: ticketOrder.currency,
      status: 'PENDING',
      rawPayload: raw
    }
  });

  await prisma.ticketOrder.updateMany({
    where: { id: ticketOrder.id, status: 'PENDING' },
    data: { status: 'AWAITING_PAYMENT' }
  });

  return { type: 'SUCCESS', paymentUrl: checkoutUrl, paymentId: payment.id };
}

async function processCallback(payload) {
  if (!payload) {
    return { type: 'INVALID', message: 'Empty callback payload' };
  }

  const config = hutkoUtils.getConfig();
  if (!config.isConfigured) {
    return { type: 'NOT_CONFIGURED', message: 'Payment gateway is not configured.' };
  }

  if (!hutkoUtils.verifySignature(payload, config.secretKey)) {
    return { type: 'INVALID_SIGNATURE', message: 'Invalid callback signature' };
  }

  const orderId = payload.order_id;
  const hutkoStatus = payload.order_status;
  const providerPaymentId = String(payload.payment_id || '');
  const amount = payload.amount ? String(payload.amount) : null;
  const currency = payload.currency || 'UAH';
  const ourStatus = mapHutkoStatus(hutkoStatus);

  const ticketOrderId = parseTicketPaymentOrderId(orderId);
  const reservationId = ticketOrderId ? null : parseOrderId(orderId);
  if (!reservationId && !ticketOrderId) {
    return { type: 'NOT_FOUND', message: 'Could not parse reservation ID from order_id' };
  }

  const updateData = {
    providerPaymentId,
    status: ourStatus,
    currency,
    rawPayload: payload
  };

  if (amount) {
    const parsedAmount = parseInt(amount, 10) / 100;
    if (!isNaN(parsedAmount)) {
      updateData.amount = parsedAmount;
    }
  }

  if (ourStatus === 'PAID') {
    updateData.paidAt = new Date();
  }

  const payment = ticketOrderId
    ? await applyTicketPaymentStatus({
      ticketOrderId,
      providerOrderId: orderId,
      providerPaymentId,
      amount,
      currency,
      status: hutkoStatus,
      rawPayload: payload
    })
    : await prisma.payment.upsert({
      where: { reservationId },
      update: updateData,
      create: {
        reservationId,
        provider: 'hutko',
        providerPaymentId,
        providerOrderId: orderId,
        amount: updateData.amount || 0,
        currency,
        status: ourStatus,
        rawPayload: payload
      }
    });

  if (ourStatus === 'PAID') {
    if (ticketOrderId) {
      return { type: 'SUCCESS', payment };
    }

    try {
      const groupLead = await prisma.reservation.findUnique({
        where: { id: reservationId },
        select: { bookingGroupId: true }
      });
      const confirmation = await prisma.reservation.updateMany({
        where: {
          ...(groupLead?.bookingGroupId ? { bookingGroupId: groupLead.bookingGroupId } : { id: reservationId }),
          status: { in: ['PENDING', 'AWAITING_PAYMENT'] }
        },
        data: { status: 'CONFIRMED' }
      });

      if (confirmation.count > 0) {
        await notifyPaidReservation(reservationId);
        await deliverPaidReservation(reservationId, payment.amount);
        const paidReservation = await prisma.reservation.findUnique({
          where: { id: reservationId },
          select: {
            analyticsDistinctId: true,
            zoneId: true,
            table: { select: { bookingKind: true } }
          }
        });
        const bookingKind = paidReservation?.table?.bookingKind || null;
        const zoneId = paidReservation?.zoneId || null;
        const distinctId = paidReservation?.analyticsDistinctId || 'server';
        const revenue = Number(payment.amount) || 0;
        analytics.capture('booking_paid', {
          revenue,
          currency,
          bookingKind,
          zoneId,
          reservationId
        }, distinctId);
        analytics.capture('$revenue', { revenue, currency }, distinctId);
      }
    } catch (emailError) {
      console.error(`[hutko] Failed to send ticket email for reservation #${reservationId}:`, emailError.message);
    }
  }

  return { type: 'SUCCESS', payment };
}

async function getPaymentStatus(providerOrderId) {
  const config = hutkoUtils.getConfig();
  if (!config.isConfigured) {
    return { type: 'NOT_CONFIGURED', message: 'Payment gateway is not configured.' };
  }

  const requestData = hutkoUtils.prepareRequest({
    order_id: providerOrderId
  });

  const raw = await postToHutko('/api/status/order_id', requestData);
  const parsed = hutkoUtils.parseResponse(raw);

  if (!parsed.success) {
    return { type: 'PROVIDER_ERROR', message: parsed.error, raw: parsed.raw };
  }

  return { type: 'SUCCESS', status: parsed.data };
}

async function syncTicketOrderPaymentStatus(ticketOrderId) {
  const payment = await prisma.payment.findUnique({
    where: { ticketOrderId },
    select: { providerOrderId: true, status: true }
  });

  if (!payment?.providerOrderId || payment.status === 'PAID') {
    return { type: 'SKIPPED' };
  }

  const result = await getPaymentStatus(payment.providerOrderId);
  if (result.type !== 'SUCCESS') return result;

  const data = result.status || {};
  await applyTicketPaymentStatus({
    ticketOrderId,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: data.payment_id,
    amount: data.amount,
    currency: data.currency || 'UAH',
    status: data.order_status,
    rawPayload: data
  });

  return { type: 'SUCCESS', status: data };
}

async function syncReservationPaymentStatus(reservationId) {
  const payment = await prisma.payment.findUnique({
    where: { reservationId },
    select: { providerOrderId: true, status: true }
  });

  if (!payment?.providerOrderId || payment.status === 'PAID') {
    return { type: 'SKIPPED' };
  }

  const result = await getPaymentStatus(payment.providerOrderId);
  if (result.type !== 'SUCCESS') return result;

  const data = result.status || {};
  const ourStatus = mapHutkoStatus(data.order_status);
  const updateData = {
    ...(data.payment_id ? { providerPaymentId: String(data.payment_id) } : {}),
    status: ourStatus,
    currency: data.currency || 'UAH',
    rawPayload: data
  };

  if (data.amount) {
    const parsedAmount = parseInt(String(data.amount), 10) / 100;
    if (!isNaN(parsedAmount)) {
      updateData.amount = parsedAmount;
    }
  }

  if (ourStatus === 'PAID') {
    updateData.paidAt = new Date();
  }

  await prisma.payment.update({
    where: { reservationId },
    data: updateData
  });

  if (ourStatus === 'PAID') {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { bookingGroupId: true }
    });
    const confirmation = await prisma.reservation.updateMany({
      where: {
        ...(reservation?.bookingGroupId ? { bookingGroupId: reservation.bookingGroupId } : { id: reservationId }),
        status: { in: ['PENDING', 'AWAITING_PAYMENT'] }
      },
      data: { status: 'CONFIRMED' }
    });
    if (confirmation.count > 0) {
      await notifyPaidReservation(reservationId);
      await deliverPaidReservation(reservationId, updateData.amount || 0);
    }
  }

  return { type: 'SUCCESS', status: data };
}

async function resolvePublicReturnPath(providerOrderId) {
  const ticketOrderId = parseTicketPaymentOrderId(providerOrderId);
  if (ticketOrderId) {
    const order = await prisma.ticketOrder.findUnique({
      where: { id: ticketOrderId },
      select: {
        orderNumber: true,
        downloadToken: true,
        event: { select: { slug: true } }
      }
    });
    if (!order) return null;

    const eventPath = order.event?.slug
      ? `/events/${encodeURIComponent(order.event.slug)}`
      : '/events';
    return `${eventPath}?ticket_order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(order.downloadToken)}`;
  }

  const reservationId = parseOrderId(providerOrderId);
  if (!reservationId) return null;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      ticketCode: true,
      reservationDate: true,
      event: { select: { slug: true } }
    }
  });
  if (!reservation?.ticketCode || !reservation.reservationDate) return null;

  const token = generateTicketSignature(reservation.ticketCode, reservation.reservationDate);
  const eventQuery = reservation.event?.slug
    ? `&event=${encodeURIComponent(reservation.event.slug)}`
    : '';
  return `/booking?reservation=${encodeURIComponent(reservation.ticketCode)}&t=${encodeURIComponent(token)}${eventQuery}`;
}

module.exports = {
  createCheckoutSession,
  createTicketCheckoutSession,
  processCallback,
  getPaymentStatus,
  syncTicketOrderPaymentStatus,
  syncReservationPaymentStatus,
  generateOrderId,
  generateTicketPaymentOrderId,
  parseOrderId,
  parseTicketPaymentOrderId,
  mapHutkoStatus,
  resolvePublicReturnPath
};
