const prisma = require('../lib/prisma');
const menuService = require('../services/menuService');
const contentService = require('../services/contentService');
const eventService = require('../services/eventService');
const { normalizeLocalizedField } = require('../utils/localization');

const LOCALIZED_SETTINGS_FIELDS = ['title', 'description', 'keywords', 'heroTitle', 'heroSubtitle', 'aboutTitle', 'aboutText', 'footerText', 'address'];

function normalizeSettings(settings) {
  if (!settings) return {};

  const normalized = { ...settings };
  for (const field of LOCALIZED_SETTINGS_FIELDS) {
    normalized[field] = normalizeLocalizedField(settings[field]);
  }

  return normalized;
}

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

async function getNews(req, res) {
  try {
    const news = await contentService.getNews();
    return res.json(news);
  } catch (error) {
    console.error('[publicController.getNews] Failed to load news.', error);
    return res.status(500).json({ message: 'Unable to load news.' });
  }
}

async function getSettings(req, res) {
  try {
    const settings = await prisma.frontendSettings.findFirst();
    return res.json(normalizeSettings(settings));
  } catch (error) {
    console.error('[publicController.getSettings] Failed to load settings.', error);
    return res.status(500).json({ message: 'Unable to load settings.' });
  }
}

async function listPositionTypes(req, res) {
  try {
    const prisma = require('../lib/prisma');
    const types = await prisma.positionType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(types);
  } catch (error) {
    console.error('[publicController.listPositionTypes]', error);
    res.status(500).json({ message: 'Unable to load position types.' });
  }
}

module.exports = {
  getHealth,
  getMenu,
  setMenuItemLike,
  getEvents,
  getEventBySlug,
  getNews,
  getSettings,
  listPositionTypes
};
