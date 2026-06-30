const prisma = require('../lib/prisma');
const tableOrderService = require('../services/tableOrderService');
const { addGuestConnection } = require('../services/waiterSseService');

async function resolveTableId(tableCode) {
  if (!tableCode) return null;
  const n = parseInt(tableCode, 10);
  if (Number.isFinite(n) && n > 0) return n;
  const table = await prisma.venueTable.findFirst({ where: { code: tableCode, isActive: true }, select: { id: true } });
  return table?.id || null;
}

async function createOrder(req, res) {
  try {
    const { tableCode, tableId: legacyTableId, customerName, customerPhone, notes, items } = req.body;
    const code = tableCode || (legacyTableId ? String(legacyTableId) : null);
    if (!code || !items?.length) {
      return res.status(400).json({ message: 'tableCode and items are required.' });
    }

    const resolvedId = await resolveTableId(code);
    if (!resolvedId) return res.status(400).json({ message: 'Table not found.' });

    const order = await tableOrderService.createTableOrder({
      tableId: resolvedId,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      notes: notes || null,
      items: items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity || 1,
        price: i.price,
        notes: i.notes
      }))
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Create table order error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function getOrderStatus(req, res) {
  try {
    const order = await tableOrderService.getOrderStatus(parseInt(req.params.id, 10));
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    console.error('Get order status error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

function orderSse(req, res) {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(400).json({ message: 'Invalid order ID.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  addGuestConnection(orderId, res);

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch {}
  }, 30000);

  req.on('close', () => clearInterval(keepalive));
}

async function createCall(req, res) {
  try {
    const { tableCode, tableId: legacyTableId, customerName } = req.body;
    const code = tableCode || (legacyTableId ? String(legacyTableId) : null);
    if (!code) return res.status(400).json({ message: 'tableCode is required.' });

    const resolvedId = await resolveTableId(code);
    if (!resolvedId) return res.status(400).json({ message: 'Table not found.' });

    const call = await tableOrderService.createWaiterCall({
      tableId: resolvedId,
      customerName
    });

    res.status(201).json(call);
  } catch (err) {
    console.error('Create call error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function getTableWaiter(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: 'code is required.' });
    const table = await prisma.venueTable.findFirst({ where: { code: code.trim().toUpperCase(), isActive: true }, select: { id: true } });
    if (!table) return res.json({ waiterName: null });
    const { getWaiterForTable } = require('../services/waiterService');
    const waiter = await getWaiterForTable(table.id);
    res.json({ waiterName: waiter?.name || null });
  } catch (err) {
    console.error('Get table waiter error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { createOrder, getOrderStatus, orderSse, createCall, getTableWaiter };
