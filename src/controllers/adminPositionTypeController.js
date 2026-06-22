const positionTypeService = require('../services/adminPositionTypeService');

async function listPositionTypes(req, res) {
  const types = await positionTypeService.listPositionTypes();
  res.json(types);
}

async function createPositionType(req, res) {
  const result = await positionTypeService.createPositionType(req.body);
  if (result.type === 'INVALID') return res.status(400).json({ message: result.message });
  if (result.type === 'CONFLICT') return res.status(409).json({ message: result.message });
  res.status(201).json(result.positionType);
}

async function updatePositionType(req, res) {
  const id = Number(req.params.id);
  const result = await positionTypeService.updatePositionType(id, req.body);
  if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
  res.json(result.positionType);
}

async function deletePositionType(req, res) {
  const id = Number(req.params.id);
  const result = await positionTypeService.deletePositionType(id);
  if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
  if (result.type === 'CONFLICT') return res.status(409).json({ message: result.message });
  res.status(204).end();
}

module.exports = {
  listPositionTypes,
  createPositionType,
  updatePositionType,
  deletePositionType
};
