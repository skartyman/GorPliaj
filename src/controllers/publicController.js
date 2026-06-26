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

let weatherCache = null;
let weatherCacheExpiry = 0;

async function getWeather(req, res) {
  try {
    const now = Date.now();
    if (weatherCache && now < weatherCacheExpiry) {
      return res.json(weatherCache);
    }

    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=46.4653&longitude=30.7625&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=7';
    const marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=46.4653&longitude=30.7625&current=sea_surface_temperature,wave_height,wave_period,wave_direction&hourly=sea_surface_temperature,wave_height,wave_period,wave_direction&timezone=auto&forecast_days=7&cell_selection=sea';

    const [weatherRes, marineRes] = await Promise.allSettled([
      fetch(weatherUrl).then((r) => r.json()),
      fetch(marineUrl).then((r) => r.json())
    ]);

    const weatherData = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
    const marineData = marineRes.status === 'fulfilled' ? marineRes.value : null;

    if (!weatherData && !marineData) {
      if (weatherCache) {
        return res.json(weatherCache);
      }
      return res.status(502).json({ message: 'Unable to fetch weather data.' });
    }

    const mergedData = {
      current: {
        tempAir: weatherData?.current?.temperature_2m ?? null,
        tempFeels: weatherData?.current?.apparent_temperature ?? null,
        humidity: weatherData?.current?.relative_humidity_2m ?? null,
        windSpeed: weatherData?.current?.wind_speed_10m ?? null,
        windDir: weatherData?.current?.wind_direction_10m ?? null,
        windGusts: weatherData?.current?.wind_gusts_10m ?? null,
        precipitation: weatherData?.current?.precipitation ?? null,
        cloudCover: weatherData?.current?.cloud_cover ?? null,
        weatherCode: weatherData?.current?.weather_code ?? null,
        isDay: weatherData?.current?.is_day ?? null,
        tempWater: marineData?.current?.sea_surface_temperature ?? null,
        waveHeight: marineData?.current?.wave_height ?? null,
        wavePeriod: marineData?.current?.wave_period ?? null,
        waveDir: marineData?.current?.wave_direction ?? null
      },
      daily: {
        tempMax: weatherData?.daily?.temperature_2m_max?.[0] ?? null,
        tempMin: weatherData?.daily?.temperature_2m_min?.[0] ?? null,
        precipProb: weatherData?.daily?.precipitation_probability_max?.[0] ?? null,
        uvMax: weatherData?.daily?.uv_index_max?.[0] ?? null,
        sunrise: weatherData?.daily?.sunrise?.[0] ?? null,
        sunset: weatherData?.daily?.sunset?.[0] ?? null
      },
      source: 'Open-Meteo',
      fetchedAt: new Date(now).toISOString()
    };

    weatherCache = mergedData;
    weatherCacheExpiry = now + 15 * 60 * 1000;

    return res.json(mergedData);
  } catch (error) {
    console.error('[publicController.getWeather] Failed to fetch weather.', error);
    if (weatherCache) {
      return res.json(weatherCache);
    }
    return res.status(500).json({ message: 'Error retrieving weather data.' });
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
  listPositionTypes,
  getWeather
};
