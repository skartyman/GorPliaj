const prisma = require('../lib/prisma');
const menuService = require('../services/menuService');
const contentService = require('../services/contentService');
const eventService = require('../services/eventService');

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

async function getEvents(req, res) {
  try {
    const includePast = ['1', 'true', 'yes'].includes(String(req.query.includePast || '').toLowerCase());
    const limitValue = Number.parseInt(String(req.query.limit || ''), 10);
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : undefined;

    const events = await eventService.listPublicEvents({ includePast, limit });
    return res.json(events);
  } catch (error) {
    console.error('[publicController.getEvents] Failed to load events.', error);
    return res.status(500).json({ message: 'Unable to load events.' });
  }
}

async function getEventBySlug(req, res) {
  try {
    const slug = String(req.params.slug || '').trim();

    if (!slug) {
      return res.status(400).json({ message: 'Event slug is invalid.' });
    }

    const event = await eventService.getPublicEventBySlug(slug);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json(event);
  } catch (error) {
    console.error('[publicController.getEventBySlug] Failed to load event.', error);
    return res.status(500).json({ message: 'Unable to load event.' });
  }
}

function getNews(req, res) {
  res.json(contentService.getNews());
}

async function getSettings(req, res) {
  try {
    const settings = await prisma.frontendSettings.findFirst();
    return res.json(settings || {});
  } catch (error) {
    console.error('[publicController.getSettings] Failed to load settings.', error);
    return res.status(500).json({ message: 'Unable to load settings.' });
  }
}

module.exports = {
  getHealth,
  getMenu,
  setMenuItemLike,
  getEvents,
  getEventBySlug,
  getNews,
  getSettings
};
