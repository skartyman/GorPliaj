const express = require('express');
const { getPaymentsStatus } = require('../../controllers/paymentsController');

const router = express.Router();

router.get('/status', getPaymentsStatus);

module.exports = router;
