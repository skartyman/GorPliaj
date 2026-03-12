const contentService = require('../services/contentService');

async function getDefaultMap(req, res) {
  try {
    const defaultMap = await contentService.getDefaultMap();

    if (!defaultMap) {
      return res.status(404).json({ message: 'Default active map not found.' });
    }

    return res.json(defaultMap);
  } catch (error) {
    console.error('[mapController.getDefaultMap] Failed to load default map.', error);
    return res.status(500).json({ message: 'Failed to load default map.' });
  }
}

module.exports = {
  getDefaultMap
};
