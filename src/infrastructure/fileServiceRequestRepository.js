const fs = require('fs/promises');
const path = require('path');
const { ServiceRequestRepository } = require('../repositories/serviceRequestRepository');

class FileServiceRequestRepository extends ServiceRequestRepository {
  constructor(filePath = path.join(process.cwd(), 'src', 'data', 'serviceRequests.json')) {
    super();
    this.filePath = filePath;
  }

  async create(serviceRequest) {
    const items = await this.#read();
    items.push(serviceRequest);
    await this.#write(items);
    return serviceRequest;
  }

  async getById(id) {
    const items = await this.#read();
    return items.find((item) => item.id === id) || null;
  }

  async listByClient(clientId) {
    const items = await this.#read();
    return items
      .filter((item) => item.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async updateStatus(id, status, assignedTo = null) {
    const items = await this.#read();
    const index = items.findIndex((item) => item.id === id);

    if (index < 0) {
      return null;
    }

    const updated = {
      ...items[index],
      status,
      assignedTo,
      updatedAt: new Date().toISOString()
    };

    items[index] = updated;
    await this.#write(items);
    return updated;
  }

  async appendAttachment(id, attachment) {
    const items = await this.#read();
    const index = items.findIndex((item) => item.id === id);

    if (index < 0) {
      return null;
    }

    const updated = {
      ...items[index],
      attachments: [...(items[index].attachments || []), attachment],
      updatedAt: new Date().toISOString()
    };

    items[index] = updated;
    await this.#write(items);
    return updated;
  }

  async #read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  async #write(items) {
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2));
  }
}

module.exports = { FileServiceRequestRepository };
