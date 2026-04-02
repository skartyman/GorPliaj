const multer = require('multer');
const { validateTelegramInitData } = require('../../services/telegram/telegramInitDataService');
const { SERVICE_REQUEST_STATUS } = require('../../domain/serviceRequest');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

function createServiceRequestController(serviceRequestService) {
  return {
    uploadMiddleware: upload.single('media'),

    validateInitData(req, res) {
      const initData = String(req.body?.initData || '');
      const result = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || '');

      if (!result.ok) {
        return res.status(401).json(result);
      }

      return res.json(result);
    },

    getClientProfile(req, res) {
      const telegramUserId = String(req.query.telegramUserId || '');
      const client = serviceRequestService.getClientByTelegramUserId(telegramUserId);

      if (!client) {
        return res.status(404).json({ message: 'Client not found.' });
      }

      return res.json(client);
    },

    async listEquipment(req, res) {
      const clientId = String(req.query.clientId || '');
      const equipment = await serviceRequestService.listEquipmentByClient(clientId);
      return res.json(equipment);
    },

    async create(req, res) {
      try {
        const created = await serviceRequestService.createServiceRequest(req.body || {});
        return res.status(201).json(created);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    },

    async getById(req, res) {
      const request = await serviceRequestService.getServiceRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: 'Service request not found.' });
      }
      return res.json(request);
    },

    async listByClient(req, res) {
      const items = await serviceRequestService.listServiceRequestsByClient(req.params.clientId);
      return res.json(items);
    },

    async updateStatus(req, res) {
      const status = String(req.body?.status || '');
      if (!Object.values(SERVICE_REQUEST_STATUS).includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }

      const updated = await serviceRequestService.updateServiceRequestStatus(req.params.id, status, req.body?.assignedTo || null);
      if (!updated) {
        return res.status(404).json({ message: 'Service request not found.' });
      }
      return res.json(updated);
    },

    async uploadMedia(req, res) {
      if (!req.file) {
        return res.status(400).json({ message: 'File is required.' });
      }

      const media = await serviceRequestService.saveMedia(req.file);
      return res.status(201).json(media);
    }
  };
}

module.exports = { createServiceRequestController };
