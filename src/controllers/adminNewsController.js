const newsService = require('../services/newsService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getAdminNews(req, res) {
  try {
    const news = await newsService.listAdminNews();
    return res.json(news);
  } catch (error) {
    console.error('[adminNewsController.getAdminNews] Failed to load news.', error);
    return res.status(500).json({ message: 'Unable to load news.' });
  }
}

async function getAdminNewsById(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'News id is invalid.' });
    }

    const news = await newsService.getAdminNewsById(id);
    if (!news) {
      return res.status(404).json({ message: 'News not found.' });
    }

    return res.json(news);
  } catch (error) {
    console.error('[adminNewsController.getAdminNewsById] Failed to load news.', error);
    return res.status(500).json({ message: 'Unable to load news.' });
  }
}

async function createAdminNews(req, res) {
  try {
    const result = await newsService.createAdminNews(req.body || {});
    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({ success: true, news: result.news });
  } catch (error) {
    console.error('[adminNewsController.createAdminNews] Failed to create news.', error);
    return res.status(500).json({ message: 'Unable to create news.' });
  }
}

async function updateAdminNews(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'News id is invalid.' });
    }

    const result = await newsService.updateAdminNews(id, req.body || {});
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'News not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ success: true, news: result.news });
  } catch (error) {
    console.error('[adminNewsController.updateAdminNews] Failed to update news.', error);
    return res.status(500).json({ message: 'Unable to update news.' });
  }
}

async function deleteAdminNews(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'News id is invalid.' });
    }

    const result = await newsService.deleteAdminNews(id);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'News not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[adminNewsController.deleteAdminNews] Failed to delete news.', error);
    return res.status(500).json({ message: 'Unable to delete news.' });
  }
}

module.exports = {
  getAdminNews,
  getAdminNewsById,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews
};
