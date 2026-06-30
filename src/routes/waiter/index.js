const { Router } = require('express');
const { requireWaiterAuth } = require('../../middleware/waiterAuth');
const waiterController = require('../../controllers/waiterController');
const tableOrderService = require('../../services/tableOrderService');
const { addWaiterConnection } = require('../../services/waiterSseService');

const router = Router();

router.post('/auth/login', waiterController.login);
router.get('/auth/me', requireWaiterAuth, waiterController.me);
router.post('/auth/logout', waiterController.logout);

router.post('/shift/start', requireWaiterAuth, waiterController.startShift);
router.post('/shift/end', requireWaiterAuth, waiterController.endShift);
router.get('/shift', requireWaiterAuth, waiterController.getShift);

router.post('/tables/scan', requireWaiterAuth, waiterController.scanTable);
router.delete('/tables/:tableId', requireWaiterAuth, waiterController.removeTable);
router.get('/tables', requireWaiterAuth, waiterController.getTables);

router.get('/sse', requireWaiterAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  addWaiterConnection(req.waiterAuth.sub, res);
  const keepalive = setInterval(() => { try { res.write(': keepalive\n\n'); } catch {} }, 30000);
  req.on('close', () => clearInterval(keepalive));
});

router.get('/orders', requireWaiterAuth, async (req, res) => {
  try {
    const shift = await waiterController.getShift ? await require('../../services/waiterService').getActiveShift(req.waiterAuth.sub) : null;
    const orders = await tableOrderService.listOrdersForWaiter(req.waiterAuth.sub, { shiftId: shift?.id });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.patch('/orders/:id/accept', requireWaiterAuth, async (req, res) => {
  try { res.json(await tableOrderService.acceptOrder(parseInt(req.params.id, 10), req.waiterAuth.sub)); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.patch('/orders/:id/complete', requireWaiterAuth, async (req, res) => {
  try { res.json(await tableOrderService.completeOrder(parseInt(req.params.id, 10))); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.patch('/orders/:id/cancel', requireWaiterAuth, async (req, res) => {
  try { res.json(await tableOrderService.cancelOrder(parseInt(req.params.id, 10))); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});

router.get('/calls', requireWaiterAuth, async (req, res) => {
  try { res.json(await tableOrderService.listCallsForWaiter(req.waiterAuth.sub)); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.patch('/calls/:id/respond', requireWaiterAuth, async (req, res) => {
  try { res.json(await tableOrderService.respondToCall(parseInt(req.params.id, 10), req.waiterAuth.sub)); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});

module.exports = router;
