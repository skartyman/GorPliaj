const menuService = require('../services/menuService');
const contentService = require('../services/contentService');

function getHealth(req, res) {
  res.json({ status: 'ok' });
}

function getMenu(req, res) {
  res.json(menuService.getMenu());
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
