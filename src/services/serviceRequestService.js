const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { APP_BASE_URL } = require('../config/env');
const clients = require('../data/clients');
const { SERVICE_REQUEST_STATUS } = require('../domain/serviceRequest');

class ServiceRequestService {
  constructor({ serviceRequestRepository, equipmentRepository, notifier }) {
    this.serviceRequestRepository = serviceRequestRepository;
    this.equipmentRepository = equipmentRepository;
    this.notifier = notifier;
  }

  getClientByTelegramUserId(telegramUserId) {
    return clients.find((item) => item.telegramUserId === String(telegramUserId)) || null;
  }

  async listEquipmentByClient(clientId) {
    return this.equipmentRepository.listByClient(clientId);
  }

  async createServiceRequest(payload) {
    const now = new Date().toISOString();
    const equipment = await this.equipmentRepository.getById(payload.equipmentId);

    if (!equipment || equipment.clientId !== payload.clientId) {
      throw new Error('Equipment not found for this client.');
    }

    const request = {
      id: crypto.randomUUID(),
      clientId: payload.clientId,
      equipmentId: payload.equipmentId,
      category: payload.category,
      description: payload.description,
      urgency: payload.urgency,
      canOperateNow: Boolean(payload.canOperateNow),
      attachments: payload.attachments || [],
      status: SERVICE_REQUEST_STATUS.NEW,
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
      source: 'telegram_mini_app'
    };

    const created = await this.serviceRequestRepository.create(request);

    const client = clients.find((item) => item.id === payload.clientId);
    await this.notifier.notifyCreated({ client, equipment, request: created });

    return created;
  }

  async getServiceRequestById(id) {
    return this.serviceRequestRepository.getById(id);
  }

  async listServiceRequestsByClient(clientId) {
    return this.serviceRequestRepository.listByClient(clientId);
  }

  async updateServiceRequestStatus(id, status, assignedTo) {
    const updated = await this.serviceRequestRepository.updateStatus(id, status, assignedTo);

    if (updated) {
      await this.notifier.notifyStatusChanged({ request: updated });
    }

    return updated;
  }

  async saveMedia(file) {
    const ext = path.extname(file.originalname || '') || '.bin';
    const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const relativePath = path.join('uploads', 'service-requests', fileName);
    const outputPath = path.join(process.cwd(), 'public', relativePath);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, file.buffer);

    return {
      id: crypto.randomUUID(),
      type: file.mimetype?.startsWith('video') ? 'video' : 'photo',
      url: `${APP_BASE_URL}/${relativePath.replaceAll(path.sep, '/')}`
    };
  }
}

module.exports = { ServiceRequestService };
