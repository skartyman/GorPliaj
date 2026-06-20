const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { autoTranslateObject } = require('./translationService');
const { normalizeLocalizedField } = require('../utils/localization');

const ORDER_STATUSES = new Set(['PENDING', 'AWAITING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED']);
const ORDER_TRANSITIONS = {
  PENDING: new Set(['AWAITING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED']),
  AWAITING_PAYMENT: new Set(['PAID', 'CANCELLED', 'EXPIRED']),
  PAID: new Set(['CANCELLED', 'REFUNDED']),
  CANCELLED: new Set(),
  EXPIRED: new Set(),
  REFUNDED: new Set()
};

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function generateOrderNumber() {
  return `GPO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function generateTicketCode() {
  return `GPT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function generateDownloadToken() {
  return crypto.randomBytes(24).toString('hex');
}

function toEventSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.eventId,
    name: normalizeLocalizedField(row.name),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    sortOrder: row.sortOrder,
    isActive: row.isActive
  };
}

function toTicketType(row) {
  return {
    ...row,
    name: normalizeLocalizedField(row.name),
    description: normalizeLocalizedField(row.description),
    price: Number(row.price),
    eventSession: toEventSession(row.eventSession)
  };
}

function toTicket(row) {
  return {
    ...row,
    ticketType: row.ticketType ? toTicketType(row.ticketType) : undefined,
    eventSession: toEventSession(row.eventSession || row.ticketType?.eventSession)
  };
}

function toOrder(row) {
  return {
    ...row,
    amount: Number(row.amount),
    payment: row.payment ? { ...row.payment, amount: Number(row.payment.amount) } : null,
    eventSession: toEventSession(row.eventSession),
    tickets: Array.isArray(row.tickets) ? row.tickets.map(toTicket) : []
  };
}

async function deliverOrderIfPaid(order) {
  if (order.status !== 'PAID') return null;
  try {
    const { deliverPaidOrder } = require('./ticketOrderDeliveryService');
    return await deliverPaidOrder(order.id);
  } catch (error) {
    console.error(`[ticketSalesService] Failed to deliver paid order ${order.orderNumber}.`, error);
    return { sent: false, reason: error.message };
  }
}

async function ensureEventSessionBelongsToEvent(eventId, eventSessionId) {
  if (!eventSessionId) return null;
  const session = await prisma.eventSession.findFirst({
    where: { id: eventSessionId, eventId }
  });
  return session || null;
}

async function eventHasSessions(eventId) {
  const count = await prisma.eventSession.count({
    where: { eventId }
  });
  return count > 0;
}

async function listTicketTypes(eventId) {
  const rows = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: [
      { eventSession: { sortOrder: 'asc' } },
      { eventSession: { startsAt: 'asc' } },
      { sortOrder: 'asc' },
      { id: 'asc' }
    ],
    include: {
      eventSession: true
    }
  });
  return rows.map(toTicketType);
}

async function createTicketType(eventId, input) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return { type: 'NOT_FOUND', message: 'Event not found.' };

  const name = await autoTranslateObject(input.name);
  if (!name.ua) return { type: 'INVALID', message: 'Ticket type name is required.' };

  const price = Number(input.price);
  const capacity = Number(input.capacity);
  if (!Number.isFinite(price) || price < 0) return { type: 'INVALID', message: 'Price must be zero or greater.' };
  if (!Number.isInteger(capacity) || capacity < 1) return { type: 'INVALID', message: 'Capacity must be a positive integer.' };

  const salesStart = normalizeDate(input.salesStart);
  const salesEnd = normalizeDate(input.salesEnd);
  if (input.salesStart && !salesStart) return { type: 'INVALID', message: 'Sales start is invalid.' };
  if (input.salesEnd && !salesEnd) return { type: 'INVALID', message: 'Sales end is invalid.' };
  if (salesStart && salesEnd && salesEnd < salesStart) {
    return { type: 'INVALID', message: 'Sales end cannot be earlier than sales start.' };
  }

  const eventSessionId = parseOptionalId(input.eventSessionId);
  if (!eventSessionId && await eventHasSessions(eventId)) {
    return { type: 'INVALID', message: 'Ticket type must be assigned to a specific event date.' };
  }
  if (eventSessionId) {
    const session = await ensureEventSessionBelongsToEvent(eventId, eventSessionId);
    if (!session) return { type: 'INVALID', message: 'Event session is invalid.' };
  }

  const row = await prisma.ticketType.create({
    data: {
      eventId,
      eventSessionId,
      name,
      description: input.description ? await autoTranslateObject(input.description) : null,
      price,
      currency: normalizeText(input.currency || 'UAH').toUpperCase(),
      capacity,
      salesStart,
      salesEnd,
      isActive: input.isActive !== false,
      sortOrder: Number.isInteger(Number(input.sortOrder)) ? Number(input.sortOrder) : 0
    },
    include: {
      eventSession: true
    }
  });
  return { type: 'SUCCESS', ticketType: toTicketType(row) };
}

async function updateTicketType(id, input) {
  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND', message: 'Ticket type not found.' };
  const hasSessions = await eventHasSessions(existing.eventId);

  const data = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    const name = await autoTranslateObject(input.name);
    if (!name.ua) return { type: 'INVALID', message: 'Ticket type name is required.' };
    data.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    data.description = input.description ? await autoTranslateObject(input.description) : null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'price')) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) return { type: 'INVALID', message: 'Price must be zero or greater.' };
    data.price = price;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'capacity')) {
    const capacity = Number(input.capacity);
    if (!Number.isInteger(capacity) || capacity < existing.soldCount) {
      return { type: 'INVALID', message: 'Capacity cannot be lower than the allocated ticket count.' };
    }
    data.capacity = capacity;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'currency')) data.currency = normalizeText(input.currency).toUpperCase();
  if (Object.prototype.hasOwnProperty.call(input, 'isActive')) data.isActive = Boolean(input.isActive);
  if (Object.prototype.hasOwnProperty.call(input, 'sortOrder')) data.sortOrder = Number(input.sortOrder) || 0;
  if (Object.prototype.hasOwnProperty.call(input, 'salesStart')) data.salesStart = normalizeDate(input.salesStart);
  if (Object.prototype.hasOwnProperty.call(input, 'salesEnd')) data.salesEnd = normalizeDate(input.salesEnd);
  if (Object.prototype.hasOwnProperty.call(input, 'eventSessionId')) {
    const eventSessionId = parseOptionalId(input.eventSessionId);
    if (eventSessionId) {
      const session = await ensureEventSessionBelongsToEvent(existing.eventId, eventSessionId);
      if (!session) return { type: 'INVALID', message: 'Event session is invalid.' };
    }
    data.eventSessionId = eventSessionId;
  }

  const nextEventSessionId = Object.prototype.hasOwnProperty.call(data, 'eventSessionId')
    ? data.eventSessionId
    : existing.eventSessionId;
  if (hasSessions && !nextEventSessionId && existing.soldCount < 1 && existing.isActive !== false) {
    return { type: 'INVALID', message: 'Ticket type must be assigned to a specific event date.' };
  }

  const nextStart = Object.prototype.hasOwnProperty.call(data, 'salesStart') ? data.salesStart : existing.salesStart;
  const nextEnd = Object.prototype.hasOwnProperty.call(data, 'salesEnd') ? data.salesEnd : existing.salesEnd;
  if (nextStart && nextEnd && nextEnd < nextStart) {
    return { type: 'INVALID', message: 'Sales end cannot be earlier than sales start.' };
  }

  const row = await prisma.ticketType.update({
    where: { id },
    data,
    include: {
      eventSession: true
    }
  });
  return { type: 'SUCCESS', ticketType: toTicketType(row) };
}

async function deleteTicketType(id) {
  const existing = await prisma.ticketType.findUnique({
    where: { id },
    select: { id: true, soldCount: true }
  });
  if (!existing) return { type: 'NOT_FOUND', message: 'Ticket type not found.' };
  if (existing.soldCount > 0) return { type: 'CONFLICT', message: 'Ticket type with allocated tickets cannot be deleted.' };
  await prisma.ticketType.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

async function createOrder(input) {
  const eventId = Number(input.eventId);
  const items = Array.isArray(input.items) ? input.items : [];
  const customerName = normalizeText(input.customerName);
  const customerEmail = normalizeText(input.customerEmail).toLowerCase();
  const customerPhone = normalizeText(input.customerPhone) || null;
  if (!Number.isInteger(eventId) || eventId < 1 || !customerName || !customerEmail || !items.length) {
    return { type: 'INVALID', message: 'Event, customer name, email and ticket items are required.' };
  }

  const requestedSessionId = parseOptionalId(input.eventSessionId);
  const quantities = new Map();
  for (const item of items) {
    const ticketTypeId = Number(item.ticketTypeId);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(ticketTypeId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return { type: 'INVALID', message: 'Ticket item is invalid.' };
    }
    quantities.set(ticketTypeId, (quantities.get(ticketTypeId) || 0) + quantity);
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const types = await tx.ticketType.findMany({
        where: { id: { in: [...quantities.keys()] }, eventId, isActive: true },
        include: {
          eventSession: true
        }
      });
      if (types.length !== quantities.size) throw new Error('INVALID_TICKET_TYPES');

      const sessionIds = [...new Set(types.map((type) => type.eventSessionId || null))];
      if (sessionIds.length > 1) throw new Error('MIXED_SESSIONS');
      const eventSessionId = sessionIds[0] || null;
      if (requestedSessionId && requestedSessionId !== eventSessionId) throw new Error('SESSION_MISMATCH');

      if (input.enforceSalesWindow) {
        const now = new Date();
        const closedType = types.find((type) =>
          (type.salesStart && type.salesStart > now) || (type.salesEnd && type.salesEnd < now)
        );
        if (closedType) throw new Error('SALES_CLOSED');
        const inactiveSession = types.find((type) => type.eventSession && !type.eventSession.isActive);
        if (inactiveSession) throw new Error('SESSION_INACTIVE');
      }

      const currencies = new Set(types.map((type) => type.currency));
      if (currencies.size !== 1) throw new Error('MIXED_CURRENCIES');

      let amount = 0;
      for (const type of types) {
        const quantity = quantities.get(type.id);
        const allocation = await tx.ticketType.updateMany({
          where: {
            id: type.id,
            soldCount: { lte: type.capacity - quantity }
          },
          data: { soldCount: { increment: quantity } }
        });
        if (allocation.count !== 1) throw new Error(`SOLD_OUT:${type.id}`);
        amount += Number(type.price) * quantity;
      }

      const created = await tx.ticketOrder.create({
        data: {
          eventId,
          eventSessionId,
          orderNumber: generateOrderNumber(),
          downloadToken: generateDownloadToken(),
          customerName,
          customerEmail,
          customerPhone,
          amount,
          currency: types[0].currency,
          status: input.status === 'PAID' ? 'PAID' : 'PENDING',
          expiresAt: input.status === 'PAID' ? null : new Date(Date.now() + 30 * 60 * 1000),
          paidAt: input.status === 'PAID' ? new Date() : null,
          tickets: {
            create: types.flatMap((type) =>
              Array.from({ length: quantities.get(type.id) }, () => ({
                eventId,
                eventSessionId,
                ticketTypeId: type.id,
                code: generateTicketCode(),
                status: input.status === 'PAID' ? 'VALID' : 'RESERVED',
                holderName: customerName,
                holderEmail: customerEmail,
                issuedAt: input.status === 'PAID' ? new Date() : null
              }))
            )
          }
        },
        include: {
          event: true,
          eventSession: true,
          payment: true,
          tickets: {
            include: {
              eventSession: true,
              ticketType: { include: { eventSession: true } }
            }
          }
        }
      });

      return created;
    });
    const normalizedOrder = toOrder(order);
    const delivery = await deliverOrderIfPaid(normalizedOrder);
    return { type: 'SUCCESS', order: normalizedOrder, delivery };
  } catch (error) {
    if (error.message === 'INVALID_TICKET_TYPES') return { type: 'INVALID', message: 'One or more ticket types are unavailable.' };
    if (error.message === 'SALES_CLOSED') return { type: 'CONFLICT', message: 'Ticket sales are closed.' };
    if (error.message === 'MIXED_CURRENCIES') return { type: 'INVALID', message: 'All ticket types in an order must use the same currency.' };
    if (error.message === 'MIXED_SESSIONS') return { type: 'INVALID', message: 'Tickets from different event dates cannot be mixed in one order.' };
    if (error.message === 'SESSION_MISMATCH') return { type: 'INVALID', message: 'Selected event date does not match the ticket type.' };
    if (error.message === 'SESSION_INACTIVE') return { type: 'CONFLICT', message: 'Ticket sales for the selected event date are not active.' };
    if (error.message.startsWith('SOLD_OUT:')) return { type: 'CONFLICT', message: 'Not enough tickets are available.' };
    throw error;
  }
}

async function expireStaleOrders() {
  const staleOrders = await prisma.ticketOrder.findMany({
    where: {
      status: { in: ['PENDING', 'AWAITING_PAYMENT'] },
      expiresAt: { lt: new Date() }
    },
    select: {
      id: true,
      tickets: { select: { ticketTypeId: true } }
    }
  });

  for (const stale of staleOrders) {
    await prisma.$transaction(async (tx) => {
      const expired = await tx.ticketOrder.updateMany({
        where: {
          id: stale.id,
          status: { in: ['PENDING', 'AWAITING_PAYMENT'] }
        },
        data: { status: 'EXPIRED' }
      });
      if (expired.count !== 1) return;

      const counts = new Map();
      for (const ticket of stale.tickets) {
        counts.set(ticket.ticketTypeId, (counts.get(ticket.ticketTypeId) || 0) + 1);
      }
      for (const [ticketTypeId, quantity] of counts) {
        await tx.ticketType.update({
          where: { id: ticketTypeId },
          data: { soldCount: { decrement: quantity } }
        });
      }
      await tx.ticket.updateMany({
        where: { orderId: stale.id, status: 'RESERVED' },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });
    });
  }

  return staleOrders.length;
}

async function listOrders(filters = {}) {
  const rows = await prisma.ticketOrder.findMany({
    where: {
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
      ...(filters.status ? { status: filters.status } : {})
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      event: true,
      eventSession: true,
      payment: true,
      tickets: {
        include: {
          eventSession: true,
          ticketType: { include: { eventSession: true } }
        }
      }
    }
  });
  return rows.map(toOrder);
}

async function getOrder(id) {
  const row = await prisma.ticketOrder.findUnique({
    where: { id },
    include: {
      event: true,
      eventSession: true,
      payment: true,
      tickets: {
        include: {
          eventSession: true,
          ticketType: { include: { eventSession: true } },
          scans: { orderBy: { scannedAt: 'desc' } }
        }
      }
    }
  });
  return row ? toOrder(row) : null;
}

async function updateOrderStatus(id, status) {
  const normalizedStatus = normalizeText(status).toUpperCase();
  if (!ORDER_STATUSES.has(normalizedStatus)) return { type: 'INVALID', message: 'Order status is invalid.' };

  const existing = await prisma.ticketOrder.findUnique({
    where: { id },
    include: { tickets: true }
  });
  if (!existing) return { type: 'NOT_FOUND', message: 'Ticket order not found.' };
  if (existing.status === normalizedStatus) {
    const order = await getOrder(id);
    return { type: 'SUCCESS', order };
  }
  if (!ORDER_TRANSITIONS[existing.status]?.has(normalizedStatus)) {
    return { type: 'CONFLICT', message: `Order cannot transition from ${existing.status} to ${normalizedStatus}.` };
  }

  const cancelling = ['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(normalizedStatus);
  const wasAllocated = !['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(existing.status);
  if (!wasAllocated && !cancelling) {
    return { type: 'CONFLICT', message: 'A released order cannot be reactivated.' };
  }
  const shouldRelease = cancelling && wasAllocated;

  const order = await prisma.$transaction(async (tx) => {
    if (shouldRelease) {
      const counts = new Map();
      for (const ticket of existing.tickets) counts.set(ticket.ticketTypeId, (counts.get(ticket.ticketTypeId) || 0) + 1);
      for (const [ticketTypeId, quantity] of counts) {
        await tx.ticketType.update({
          where: { id: ticketTypeId },
          data: { soldCount: { decrement: quantity } }
        });
      }
    }

    const ticketStatus = normalizedStatus === 'PAID'
      ? 'VALID'
      : normalizedStatus === 'REFUNDED'
        ? 'REFUNDED'
        : cancelling
          ? 'CANCELLED'
          : 'RESERVED';

    await tx.ticket.updateMany({
      where: { orderId: id, status: { not: 'USED' } },
      data: {
        status: ticketStatus,
        ...(normalizedStatus === 'PAID' ? { issuedAt: new Date() } : {}),
        ...(cancelling ? { cancelledAt: new Date() } : {})
      }
    });

    return tx.ticketOrder.update({
      where: { id },
      data: {
        status: normalizedStatus,
        ...(normalizedStatus === 'PAID' ? { paidAt: existing.paidAt || new Date() } : {}),
        ...(normalizedStatus === 'CANCELLED' ? { cancelledAt: new Date() } : {})
      },
      include: {
        event: true,
        eventSession: true,
        payment: true,
        tickets: {
          include: {
            eventSession: true,
            ticketType: { include: { eventSession: true } }
          }
        }
      }
    });
  });
  const normalizedOrder = toOrder(order);
  const delivery = await deliverOrderIfPaid(normalizedOrder);
  return { type: 'SUCCESS', order: normalizedOrder, delivery };
}

async function listTickets(filters = {}) {
  const rows = await prisma.ticket.findMany({
    where: {
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.orderId ? { orderId: filters.orderId } : {})
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      event: true,
      eventSession: true,
      order: true,
      ticketType: {
        include: {
          eventSession: true
        }
      }
    }
  });
  return rows.map(toTicket);
}

async function verifyTicket(code) {
  const ticket = await prisma.ticket.findUnique({
    where: { code: normalizeText(code).toUpperCase() },
    include: {
      event: true,
      eventSession: true,
      order: true,
      ticketType: {
        include: {
          eventSession: true
        }
      },
      scans: { orderBy: { scannedAt: 'desc' }, take: 10 }
    }
  });
  return ticket ? toTicket(ticket) : null;
}

async function useTicket(code, adminUserId) {
  const normalizedCode = normalizeText(code).toUpperCase();
  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { code: normalizedCode } });
    if (!ticket) return { type: 'NOT_FOUND' };
    if (ticket.status !== 'VALID') {
      await tx.ticketScan.create({
        data: { ticketId: ticket.id, adminUserId, result: `REJECTED_${ticket.status}` }
      });
      return { type: 'INVALID_STATUS', status: ticket.status };
    }

    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: 'USED', usedAt: new Date() },
      include: {
        event: true,
        eventSession: true,
        order: true,
        ticketType: { include: { eventSession: true } }
      }
    });
    await tx.ticketScan.create({
      data: { ticketId: ticket.id, adminUserId, result: 'ACCEPTED' }
    });
    return { type: 'SUCCESS', ticket: updated };
  });
  return result.type === 'SUCCESS' ? { ...result, ticket: toTicket(result.ticket) } : result;
}

module.exports = {
  listTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  listTickets,
  verifyTicket,
  useTicket,
  expireStaleOrders
};
