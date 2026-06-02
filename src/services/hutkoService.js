const https = require('https');
const prisma = require('../lib/prisma');
const hutkoUtils = require('../utils/hutko');
const { sendTicketEmail } = require('./emailService');
const { buildVerifyUrl } = require('../utils/ticketSignature');
const QRCode = require('qrcode');

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

function parseOrderId(orderId) {
  if (!orderId || typeof orderId !== 'string') return null;
  const parts = orderId.split('-');
  const id = parseInt(parts[1], 10);
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

async function createCheckoutSession({ reservationId, amount, description, currency = 'UAH', customerEmail, customerPhone }) {
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

  const requestData = hutkoUtils.prepareRequest({
    order_id: orderId,
    order_desc: description || `Reservation #${reservationId}`,
    currency,
    amount: String(amountCents),
    response_url: `${process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev'}/api/paygate/hutko/return`,
    server_callback_url: `${process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev'}/api/paygate/hutko/callback`,
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

  const reservationId = parseOrderId(orderId);
  if (!reservationId) {
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

  const payment = await prisma.payment.upsert({
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
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          table: { select: { name: true } },
          payment: true
        }
      });

      if (reservation && reservation.customerEmail) {
        const verifyUrl = buildVerifyUrl(reservation.ticketCode, reservation.reservationDate);
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 300, margin: 2 });

        await sendTicketEmail({
          to: reservation.customerEmail,
          ticketCode: reservation.ticketCode,
          customerName: reservation.customerName,
          reservationDate: reservation.reservationDate,
          timeFrom: reservation.timeFrom,
          timeTo: reservation.timeTo,
          guests: reservation.guests,
          tableName: reservation.table?.name || '',
          qrDataUrl,
          status: 'PAID'
        });
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

module.exports = {
  createCheckoutSession,
  processCallback,
  getPaymentStatus,
  generateOrderId,
  parseOrderId,
  mapHutkoStatus
};
