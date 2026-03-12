const express = require('express');
const { getAdminStatus } = require('../../controllers/adminController');

const router = express.Router();

router.get('/status', getAdminStatus);

module.exports = router;
