const express = require('express');
const { FileServiceRequestRepository } = require('../../infrastructure/fileServiceRequestRepository');
const { SurpressoEquipmentRepository } = require('../../infrastructure/surpressoEquipmentRepository');
const { TelegramNotifierService } = require('../../services/telegramNotifierService');
const { ServiceRequestService } = require('../../services/serviceRequestService');
const { createServiceRequestController } = require('../../controllers/telegram/serviceRequestController');

const router = express.Router();

const service = new ServiceRequestService({
  serviceRequestRepository: new FileServiceRequestRepository(),
  equipmentRepository: new SurpressoEquipmentRepository(),
  notifier: new TelegramNotifierService()
});

const controller = createServiceRequestController(service);

router.post('/init/validate', controller.validateInitData);
router.get('/clients/me', controller.getClientProfile);
router.get('/clients/me/equipment', controller.listEquipment);
router.post('/service-requests/media', controller.uploadMiddleware, controller.uploadMedia);
router.post('/service-requests', controller.create);
router.get('/service-requests/:id', controller.getById);
router.get('/clients/:clientId/service-requests', controller.listByClient);
router.patch('/service-requests/:id/status', controller.updateStatus);

module.exports = router;
