const prisma = require('../lib/prisma');
const { getWaiterForTable } = require('./waiterService');
const { notifyWaiterNewOrder, notifyWaiterNewCall } = require('./waiterTelegramService');
const { broadcastToWaiter, broadcastToGuest } = require('./waiterSseService');

async function createTableOrder({ tableId, customerName, customerPhone, notes, items }) {
  const waiter = await getWaiterForTable(tableId);

  const order = await prisma.tableOrder.create({
    data: {
      tableId,
      waiterId: waiter?.id || null,
      customerName,
      customerPhone,
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
    include: { items: true }
  });

  const orderData = {
    id: order.id,
    tableId: order.tableId,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(i => ({
      id: i.id,
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      price: Number(i.price),
      notes: i.notes
    }))
  };

  if (waiter) {
    broadcastToWaiter(waiter.id, { type: 'NEW_ORDER', order: orderData });
    notifyWaiterNewOrder(waiter, orderData, tableId).catch(() => {});
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

async function listOrdersForWaiter(waiterId, { shiftId } = {}) {
  const where = { waiterId };
  if (shiftId) where.shiftId = shiftId;

  return prisma.tableOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });
}

async function listOrdersForTable(tableId) {
  return prisma.tableOrder.findMany({
    where: { tableId, status: { notIn: ['CANCELLED'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { items: true }
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
    include: { items: true, waiter: { select: { id: true, name: true } } }
  });
}

async function createWaiterCall({ tableId, customerName }) {
  const waiter = await getWaiterForTable(tableId);

  const call = await prisma.waiterCall.create({
    data: {
      tableId,
      waiterId: waiter?.id || null
    }
  });

  const callData = {
    id: call.id,
    tableId: call.tableId,
    status: call.status,
    createdAt: call.createdAt.toISOString()
  };

  if (waiter) {
    broadcastToWaiter(waiter.id, { type: 'NEW_CALL', call: callData, customerName });
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
    where: { waiterId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
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
