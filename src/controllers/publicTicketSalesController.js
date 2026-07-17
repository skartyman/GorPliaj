const fs = require('fs');
const prisma = require('../lib/prisma');
const ticketSalesService = require('../services/ticketSalesService');
const hutkoService = require('../services/hutkoService');
const { normalizeLocalizedField } = require('../utils/localization');
const {
  generateTicketOrderPdf,
  getOrderForDelivery,
  cachedPdfExists,
  pdfCachePath,
  ensureCacheDir
} = require('../services/ticketOrderDeliveryService');

function isSalesOpen(ticketType, now) {
  if (!ticketType.isActive || ticketType.soldCount >= ticketType.capacity) return false;
  if (ticketType.salesStart && ticketType.salesStart > now) return false;
  if (ticketType.salesEnd && ticketType.salesEnd < now) return false;
  if (ticketType.eventSession && !ticketType.eventSession.isActive) return false;
  return true;
}

function toSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    name: normalizeLocalizedField(session.name),
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    sortOrder: session.sortOrder,
    isActive: session.isActive,
    admissionMode: session.admissionMode || 'TICKETED'
  };
}

async function getEventTicketTypes(req, res) {
  try {
    await ticketSalesService.expireStaleOrders();
    const slug = String(req.params.slug || '').trim();
    const event = await prisma.event.findFirst({
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
        sessions: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { id: 'asc' }]
        },
        ticketTypes: {
          orderBy: [
            { eventSession: { sortOrder: 'asc' } },
            { eventSession: { startsAt: 'asc' } },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
          include: {
            eventSession: true
          }
        }
      }
    });
    if (!event) return res.status(404).json({ message: 'Event ticket sales are not available.' });

    const now = new Date();
    const ticketTypes = event.ticketTypes
      .filter((type) => isSalesOpen(type, now))
      .filter((type) => type.eventSession?.admissionMode !== 'FREE')
      .map((type) => ({
        id: type.id,
        eventSessionId: type.eventSessionId || null,
        eventSession: toSession(type.eventSession),
        name: normalizeLocalizedField(type.name),
        description: normalizeLocalizedField(type.description),
        price: Number(type.price),
        currency: type.currency,
        available: Math.max(0, type.capacity - type.soldCount),
        salesEnd: type.salesEnd
      }));

    return res.json({
      event: {
        id: event.id,
        slug: event.slug,
        title: normalizeLocalizedField(event.title),
        startAt: event.startAt
      },
      sessions: event.sessions.map(toSession),
      ticketTypes
    });
  } catch (error) {
    console.error('[publicTicketSales.getEventTicketTypes] Failed.', error);
    return res.status(500).json({ message: 'Unable to load ticket types.' });
  }
}

async function createTicketOrder(req, res) {
  try {
    await ticketSalesService.expireStaleOrders();
    const slug = String(req.params.slug || '').trim();
    const event = await prisma.event.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        ctaType: { in: ['TICKETS', 'BOTH'] }
      },
      select: { id: true }
    });
    if (!event) return res.status(404).json({ message: 'Event ticket sales are not available.' });

    const result = await ticketSalesService.createOrder({
      eventId: event.id,
      eventSessionId: req.body?.eventSessionId,
      customerName: req.body?.customerName,
      customerEmail: req.body?.customerEmail,
      customerPhone: req.body?.customerPhone,
      items: req.body?.items,
      status: 'PENDING',
      enforceSalesWindow: true
    });

    if (result.type === 'INVALID') return res.status(400).json({ message: result.message });
    if (result.type === 'CONFLICT') return res.status(409).json({ message: result.message });

    let payment = null;
    if (Number(result.order.amount) > 0) {
      payment = await hutkoService.createTicketCheckoutSession({ ticketOrderId: result.order.id });
      if (payment.type === 'NOT_CONFIGURED') {
        await ticketSalesService.updateOrderStatus(result.order.id, 'CANCELLED');
        return res.status(503).json({ message: 'Payment gateway is not configured.' });
      }
      if (payment.type === 'PROVIDER_ERROR') {
        await ticketSalesService.updateOrderStatus(result.order.id, 'CANCELLED');
        return res.status(502).json({ message: payment.message || 'Unable to create payment link.' });
      }
      if (payment.type !== 'SUCCESS' && payment.type !== 'EXISTS') {
        await ticketSalesService.updateOrderStatus(result.order.id, 'CANCELLED');
        return res.status(500).json({ message: payment.message || 'Unable to create payment link.' });
      }
    } else {
      await ticketSalesService.updateOrderStatus(result.order.id, 'PAID');
    }

    return res.status(201).json({
      success: true,
      order: {
        orderNumber: result.order.orderNumber,
        amount: result.order.amount,
        currency: result.order.currency,
        status: Number(result.order.amount) > 0 ? 'AWAITING_PAYMENT' : 'PAID',
        ticketCount: result.order.tickets.length,
        downloadToken: result.order.downloadToken,
        paymentUrl: payment?.paymentUrl || null
      }
    });
  } catch (error) {
    console.error('[publicTicketSales.createTicketOrder] Failed.', error);
    return res.status(500).json({ message: 'Unable to create ticket order.' });
  }
}

async function getTicketOrderStatus(req, res) {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim();
    const token = String(req.query.token || '').trim();
    let order = await prisma.ticketOrder.findFirst({
      where: { orderNumber, downloadToken: token },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        amount: true,
        currency: true,
        downloadToken: true,
        payment: { select: { paymentUrl: true, status: true } }
      }
    });
    if (!order) return res.status(404).json({ message: 'Ticket order not found.' });

    if (order.status !== 'PAID' && order.payment?.paymentUrl) {
      await hutkoService.syncTicketOrderPaymentStatus(order.id).catch((error) => {
        console.error('[publicTicketSales.getTicketOrderStatus] Payment sync failed.', error);
      });
      order = await prisma.ticketOrder.findFirst({
        where: { orderNumber, downloadToken: token },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          amount: true,
          currency: true,
          downloadToken: true,
          payment: { select: { paymentUrl: true, status: true } }
        }
      });
      if (!order) return res.status(404).json({ message: 'Ticket order not found.' });
    }

    const isPaid = order.status === 'PAID';

    return res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      amount: Number(order.amount),
      currency: order.currency,
      paymentUrl: isPaid ? null : order.payment?.paymentUrl || null,
      paymentStatus: order.payment?.status || null,
      downloadUrl: isPaid
        ? `/api/ticket-orders/${encodeURIComponent(order.orderNumber)}/pdf?token=${encodeURIComponent(order.downloadToken)}`
        : null,
      pdfReady: isPaid
    });
  } catch (error) {
    console.error('[publicTicketSales.getTicketOrderStatus] Failed.', error);
    return res.status(500).json({ message: 'Unable to load ticket order.' });
  }
}

async function downloadTicketOrderPdf(req, res) {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim();
    const token = String(req.query.token || '').trim();
    const order = await prisma.ticketOrder.findFirst({
      where: { orderNumber, downloadToken: token },
      select: { id: true, status: true }
    });
    if (!order) return res.status(404).json({ message: 'Ticket order not found.' });
    if (order.status !== 'PAID') return res.status(409).json({ message: 'Tickets are available after payment.' });

    if (cachedPdfExists(orderNumber)) {
      const cached = fs.readFileSync(pdfCachePath(orderNumber));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="gorpliaj-${orderNumber}.pdf"`);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(cached);
    }

    const deliveryOrder = await getOrderForDelivery(order.id);
    const pdf = await generateTicketOrderPdf(deliveryOrder);
    ensureCacheDir();
    fs.writeFileSync(pdfCachePath(orderNumber), pdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gorpliaj-${orderNumber}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(pdf);
  } catch (error) {
    console.error('[publicTicketSales.downloadTicketOrderPdf] Failed.', error);
    return res.status(500).json({ message: 'Unable to generate ticket PDF.' });
  }
}

module.exports = {
  getEventTicketTypes,
  createTicketOrder,
  getTicketOrderStatus,
  downloadTicketOrderPdf
};
