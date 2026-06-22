const beachRowService = require('../services/adminBeachRowService');

async function listBeachRows(req, res) {
  const mapId = Number(req.params.mapId);
  const rows = await beachRowService.listBeachRows(mapId);
  res.json(rows);
}

async function createBeachRow(req, res) {
  const mapId = Number(req.params.mapId);
  const result = await beachRowService.createBeachRow(mapId, req.body);
  if (result.type === 'INVALID') return res.status(400).json({ message: result.message });
  res.status(201).json(result.beachRow);
}

async function updateBeachRow(req, res) {
  const id = Number(req.params.id);
  const result = await beachRowService.updateBeachRow(id, req.body);
  if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
  res.json(result.beachRow);
}

async function deleteBeachRow(req, res) {
  const id = Number(req.params.id);
  const result = await beachRowService.deleteBeachRow(id);
  if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
  if (result.type === 'CONFLICT') return res.status(409).json({ message: result.message });
  res.status(204).end();
}

module.exports = { listBeachRows, createBeachRow, updateBeachRow, deleteBeachRow };
