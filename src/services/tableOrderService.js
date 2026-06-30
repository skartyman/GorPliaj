const prisma = require('../lib/prisma');
const { getWaiterForTable } = require('./waiterService');
const { notifyWaiterNewOrder, notifyWaiterNewCall } = require('./waiterTelegramService');
const { broadcastToWaiter, broadcastToGuest, broadcastToAllWaiters } = require('./waiterSseService');

function resolveName(json) {
  if (!json) return null;
  if (typeof json === 'string') return json;
  return json.ua || json.ru || json.en || null;
}

function mapItems(items) {
  return items.map(i => ({
    id: i.id,
    menuItemId: i.menuItemId,
    name: resolveName(i.menuItem?.name),
    quantity: i.quantity,
    price: Number(i.price),
    notes: i.notes
  }));
}

async function createTableOrder({ tableId, customerName, customerPhone, notes, items }) {
  const waiter = await getWaiterForTable(tableId);

  const order = await prisma.tableOrder.create({
    data: {
      tableId,
      waiterId: waiter?.id || null,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      notes: notes || null,
      items: {
        create: items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity || 1,
          price: item.price,
          notes: item.notes || null
        }))
      }
    },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      waiter: { select: { id: true, name: true } },
      table: { select: { id: true, code: true } }
    }
  });

  const orderData = {
    id: order.id,
    tableId: order.tableId,
    tableCode: order.table?.code || null,
    table: order.table ? { id: order.table.id, code: order.table.code } : null,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    waiterName: order.waiter?.name || null,
    createdAt: order.createdAt.toISOString(),
    items: mapItems(order.items)
  };

  if (waiter) {
    broadcastToWaiter(waiter.id, { type: 'NEW_ORDER', order: orderData });
    notifyWaiterNewOrder(waiter, orderData, tableId).catch(() => {});
  } else {
    broadcastToAllWaiters({ type: 'NEW_ORDER', order: orderData });
  }

  return orderData;
}

async function getOrderStatus(orderId) {
  const order = await prisma.tableOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, acceptedAt: true, completedAt: true }
  });
  return order || null;
}

async function acceptOrder(orderId, waiterId) {
  const order = await prisma.tableOrder.update({
    where: { id: orderId },
    data: { status: 'ACCEPTED', acceptedAt: new Date(), waiterId },
    include: { items: true }
  });

  const statusData = { id: order.id, status: order.status, acceptedAt: order.acceptedAt?.toISOString() };
  broadcastToGuest(order.id, { type: 'STATUS_UPDATE', ...statusData });

  return order;
}

async function completeOrder(orderId) {
  const order = await prisma.tableOrder.update({
    where: { id: orderId },
    data: { status: 'COMPLETED', completedAt: new Date() }
  });

  broadcastToGuest(order.id, { type: 'STATUS_UPDATE', id: order.id, status: order.status, completedAt: order.completedAt?.toISOString() });
  return order;
}

async function cancelOrder(orderId) {
  const order = await prisma.tableOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' }
  });

  broadcastToGuest(order.id, { type: 'STATUS_UPDATE', id: order.id, status: order.status });
  return order;
}

async function listOrdersForWaiter(waiterId) {
  return prisma.tableOrder.findMany({
    where: { waiterId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      table: { select: { id: true, code: true } }
    }
  });
}

async function listOrdersForTable(tableId) {
  return prisma.tableOrder.findMany({
    where: { tableId, status: { notIn: ['CANCELLED'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { items: { include: { menuItem: { select: { name: true } } } } }
  });
}

async function getAllOrders({ date, status, waiterId } = {}) {
  const where = {};
  if (status) where.status = status;
  if (waiterId) where.waiterId = waiterId;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  return prisma.tableOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      waiter: { select: { id: true, name: true } }
    }
  });
}

async function createWaiterCall({ tableId, customerName }) {
  const waiter = await getWaiterForTable(tableId);
  const table = await prisma.venueTable.findUnique({ where: { id: tableId }, select: { code: true } });

  const call = await prisma.waiterCall.create({
    data: {
      tableId,
      waiterId: waiter?.id || null
    },
    include: { table: { select: { id: true, code: true } } }
  });

  const callData = {
    id: call.id,
    tableId: call.tableId,
    tableCode: call.table?.code || null,
    table: call.table ? { id: call.table.id, code: call.table.code } : null,
    status: call.status,
    createdAt: call.createdAt.toISOString()
  };

  broadcastToAllWaiters({ type: 'NEW_CALL', call: callData, customerName });
  if (waiter) {
    notifyWaiterNewCall(waiter, tableId, customerName).catch(() => {});
  }

  return callData;
}

async function respondToCall(callId, waiterId) {
  const call = await prisma.waiterCall.update({
    where: { id: callId },
    data: { status: 'ACCEPTED', waiterId, respondedAt: new Date() }
  });
  return call;
}

async function listCallsForWaiter(waiterId) {
  return prisma.waiterCall.findMany({
    where: { status: 'PENDING', OR: [{ waiterId }, { waiterId: null }] },
    orderBy: { createdAt: 'desc' },
    include: { table: { select: { id: true, code: true } } }
  });
}

async function listPendingCalls() {
  return prisma.waiterCall.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = {
  createTableOrder,
  getOrderStatus,
  acceptOrder,
  completeOrder,
  cancelOrder,
  listOrdersForWaiter,
  listOrdersForTable,
  getAllOrders,
  createWaiterCall,
  respondToCall,
  listCallsForWaiter,
  listPendingCalls
};
