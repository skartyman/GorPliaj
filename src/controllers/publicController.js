const menuService = require('../services/menuService');
const contentService = require('../services/contentService');

function getHealth(req, res) {
  res.json({ status: 'ok' });
}

async function getMenu(req, res) {
  try {
    const menu = await menuService.getMenu();
    return res.json(menu);
  } catch (error) {
    console.error('[publicController.getMenu] Failed to load menu.', error);
    return res.status(500).json({ message: 'Unable to load menu.' });
  }
}

function getEvents(req, res) {
  res.json(contentService.getEvents());
}

function getNews(req, res) {
  res.json(contentService.getNews());
}

module.exports = {
  getHealth,
  getMenu,
  getEvents,
  getNews
};
