class ServiceRequestRepository {
  async create(serviceRequest) {
    throw new Error('Not implemented');
  }

  async getById(id) {
    throw new Error('Not implemented');
  }

  async listByClient(clientId) {
    throw new Error('Not implemented');
  }

  async updateStatus(id, status, assignedTo = null) {
    throw new Error('Not implemented');
  }

  async appendAttachment(id, attachment) {
    throw new Error('Not implemented');
  }
}

module.exports = { ServiceRequestRepository };
