const express = require('express');
const { FileServiceRequestRepository } = require('../../infrastructure/fileServiceRequestRepository');
const { SurpressoEquipmentRepository } = require('../../infrastructure/surpressoEquipmentRepository');
const { TelegramNotifierService } = require('../../services/telegramNotifierService');
const { ServiceRequestService } = require('../../services/serviceRequestService');
const { createServiceRequestController } = require('../../controllers/telegram/serviceRequestController');
const { TELEGRAM_MINIAPP_UPLOADS_ROOT, TELEGRAM_MINIAPP_STATUS_WEBHOOK_URL } = require('../../config/env');

const router = express.Router();

const service = new ServiceRequestService({
  serviceRequestRepository: new FileServiceRequestRepository(),
  equipmentRepository: new SurpressoEquipmentRepository(),
  notifier: new TelegramNotifierService(),
  uploadsRoot: TELEGRAM_MINIAPP_UPLOADS_ROOT,
  statusWebhookUrl: TELEGRAM_MINIAPP_STATUS_WEBHOOK_URL
});

const controller = createServiceRequestController(service);

router.post('/init/validate', controller.validateInitData);
router.get('/clients/me', controller.getClientProfile);
router.get('/clients/me/equipment', controller.listEquipment);
router.get('/clients/:clientId/equipment/:equipmentId', controller.getEquipmentById);
router.post('/service-requests/media', controller.uploadMiddleware, controller.uploadMedia);
router.post('/service-requests', controller.create);
router.get('/service-requests/:id', controller.getById);
router.get('/clients/:clientId/service-requests', controller.listByClient);
router.patch('/service-requests/:id/status', controller.updateStatus);
router.post('/webhooks/service-requests/:id/status-updated', controller.statusUpdatedWebhook);

module.exports = router;
