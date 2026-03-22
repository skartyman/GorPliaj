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

async function setMenuItemLike(req, res) {
  try {
    const itemId = Number(req.params.id);
    const liked = typeof req.body?.liked === 'boolean' ? req.body.liked : null;

    if (!Number.isInteger(itemId) || itemId <= 0 || liked === null) {
      return res.status(400).json({ message: 'Menu item id or like payload is invalid.' });
    }

    const result = await menuService.setMenuItemLike(itemId, liked);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.json({
      success: true,
      item: result.item
    });
  } catch (error) {
    console.error('[publicController.setMenuItemLike] Failed to update likes.', error);
    return res.status(500).json({ message: 'Unable to update likes.' });
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
  setMenuItemLike,
  getEvents,
  getNews
};
