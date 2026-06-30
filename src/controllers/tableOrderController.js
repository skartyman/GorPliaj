const tableOrderService = require('../services/tableOrderService');
const { addGuestConnection } = require('../services/waiterSseService');

async function createOrder(req, res) {
  try {
    const { tableId, customerName, customerPhone, notes, items } = req.body;
    if (!tableId || !customerName || !customerPhone || !items?.length) {
      return res.status(400).json({ message: 'tableId, customerName, customerPhone, and items are required.' });
    }

    const order = await tableOrderService.createTableOrder({
      tableId: parseInt(tableId, 10),
      customerName,
      customerPhone,
      notes,
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
    const { tableId, customerName } = req.body;
    if (!tableId) return res.status(400).json({ message: 'tableId is required.' });

    const call = await tableOrderService.createWaiterCall({
      tableId: parseInt(tableId, 10),
      customerName
    });

    res.status(201).json(call);
  } catch (err) {
    console.error('Create call error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { createOrder, getOrderStatus, orderSse, createCall };
