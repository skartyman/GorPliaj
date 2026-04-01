const equipmentData = require('../data/equipment');
const { EquipmentRepository } = require('../repositories/equipmentRepository');

class SurpressoEquipmentRepository extends EquipmentRepository {
  async listByClient(clientId) {
    return equipmentData.filter((item) => item.clientId === clientId);
  }

  async getById(equipmentId) {
    return equipmentData.find((item) => item.id === equipmentId) || null;
  }
}

module.exports = { SurpressoEquipmentRepository };
