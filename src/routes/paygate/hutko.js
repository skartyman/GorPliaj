const express = require('express');
const hutkoService = require('../../services/hutkoService');
const { requireAdminAuth } = require('../../middleware/adminAuth');

const router = express.Router();

router.post('/checkout', requireAdminAuth, async (req, res) => {
  try {
    const { reservationId, amount, description, currency, customerEmail, customerPhone } = req.body || {};
    if (!reservationId || !amount) {
      return res.status(400).json({ message: 'reservationId and amount are required.' });
    }

    const result = await hutkoService.createCheckoutSession({
      reservationId,
      amount,
      description,
      currency,
      customerEmail,
      customerPhone
    });

    if (result.type === 'NOT_CONFIGURED') {
      return res.status(503).json({ message: result.message });
    }
    if (result.type === 'ALREADY_PAID') {
      return res.status(409).json({ message: result.message });
    }
    if (result.type === 'PROVIDER_ERROR') {
      return res.status(502).json({ message: result.message });
    }

    return res.json({ paymentUrl: result.paymentUrl, paymentId: result.paymentId });
  } catch (error) {
    console.error('[hutko.checkout] Failed to create checkout session.', error);
    return res.status(500).json({ message: 'Failed to create checkout session.' });
  }
});

router.post('/callback', async (req, res) => {
  try {
    const payload = req.body;
    const result = await hutkoService.processCallback(payload);

    if (result.type === 'INVALID_SIGNATURE') {
      console.warn('[hutko.callback] Invalid signature received.');
      return res.status(403).json({ message: result.message });
    }

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: result.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[hutko.callback] Failed to process callback.', error);
    return res.status(500).json({ message: 'Failed to process callback.' });
  }
});

function handleReturn(req, res) {
  const orderId = req.query.order_id || '';
  const status = req.query.order_status || '';
  const kind = req.query.kind || '';
  const returnTo = typeof req.query.return_to === 'string' && req.query.return_to.startsWith('/')
    ? req.query.return_to
    : '/events';

  if (kind === 'ticket' || kind === 'reservation') {
    const query = new URLSearchParams({
      payment_status: String(status || ''),
      order_id: String(orderId || '')
    });
    const separator = returnTo.includes('?') ? '&' : '?';
    return res.redirect(`${returnTo}${separator}${query.toString()}`);
  }

  if (status === 'approved') {
    return res.redirect(`/admin/payments?success=1&order_id=${encodeURIComponent(orderId)}`);
  }

  return res.redirect(`/admin/payments?status=${encodeURIComponent(status)}&order_id=${encodeURIComponent(orderId)}`);
}

router.get('/return', handleReturn);
router.post('/return', handleReturn);

module.exports = router;
