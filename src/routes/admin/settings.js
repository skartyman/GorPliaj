const express = require('express');
const router = express.Router();

const adminSettingsController = require('../controllers/adminSettingsController');

// GET /admin/settings - Получить настройки
router.get('/', adminSettingsController.getSettings);

// POST /admin/settings - Обновить настройки
router.post('/', adminSettingsController.updateSettings);

module.exports = router;