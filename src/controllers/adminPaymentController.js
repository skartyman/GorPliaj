const paymentService = require('../services/paymentService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getAdminPayments(req, res) {
  try {
    const payments = await paymentService.listAdminPayments();
    return res.json(payments);
  } catch (error) {
    console.error('[adminPaymentController.getAdminPayments] Failed to load payments.', error);
    return res.status(500).json({ message: 'Unable to load payments.' });
  }
}

async function getAdminPaymentById(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Payment id is invalid.' });
    }

    const payment = await paymentService.getAdminPaymentById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    return res.json(payment);
  } catch (error) {
    console.error('[adminPaymentController.getAdminPaymentById] Failed to load payment.', error);
    return res.status(500).json({ message: 'Unable to load payment.' });
  }
}

async function updateAdminPaymentStatus(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Payment id is invalid.' });
    }

    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const result = await paymentService.updatePaymentStatus(id, status);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ success: true, payment: result.payment });
  } catch (error) {
    console.error('[adminPaymentController.updateAdminPaymentStatus] Failed to update payment.', error);
    return res.status(500).json({ message: 'Unable to update payment.' });
  }
}

async function getPaygateConfig(req, res) {
  try {
    const config = paymentService.getPaygateConfig();
    return res.json(config);
  } catch (error) {
    console.error('[adminPaymentController.getPaygateConfig] Failed to get config.', error);
    return res.status(500).json({ message: 'Unable to get paygate config.' });
  }
}

module.exports = {
  getAdminPayments,
  getAdminPaymentById,
  updateAdminPaymentStatus,
  getPaygateConfig
};
