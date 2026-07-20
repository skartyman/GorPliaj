const prisma = require('../lib/prisma');
const guestAuthService = require('../services/guestAuthService');
const shellService = require('../services/shellService');
const hutkoService = require('../services/hutkoService');
const { sendGuestMagicLinkEmail } = require('../services/emailService');
const { getBaseUrl } = require('../utils/deliveryPresentation');
const contentService = require('../services/contentService');
const reservationService = require('../services/reservationService');
const { getVenueClockParts, toDateTime } = require('../utils/venueTime');
const { generateTicketCode } = require('../utils/ticket');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function requestMagicLink(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }
    const loginOnly = req.body.loginOnly === true;
    const guest = loginOnly
      ? await guestAuthService.findGuestByEmail(email)
      : await guestAuthService.findOrCreateGuest({
          email,
          phone: req.body.phone || null,
          name: req.body.name || null
        });
    if (!guest) {
      return res.status(404).json({ message: 'Guest account not found.' });
    }
    const link = await guestAuthService.createMagicLink(guest.id);
    const baseUrl = getBaseUrl(req) || (process.env.APP_BASE_URL || 'http://localhost:8080');
    const loginUrl = `${baseUrl}/cabinet?token=${encodeURIComponent(link.token)}`;
    await sendGuestMagicLinkEmail({ to: email, loginUrl });
    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error('[guestController.requestMagicLink] Failed.', error);
    return res.status(500).json({ message: 'Failed to send login link.' });
  }
}

async function verifyMagicLink(req, res) {
  try {
    const token = req.body.token;
    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }
    const guest = await guestAuthService.verifyMagicLink(token);
    if (!guest) {
      return res.status(401).json({ message: 'Invalid or expired login link.' });
    }
    const authToken = guestAuthService.generateToken(guest);
    return res.status(200).json({
      token: authToken,
      guest: {
        id: guest.id,
        email: guest.email,
        phone: guest.phone,
        name: guest.name,
        shellBalance: Number(guest.shellBalance || 0)
      }
    });
  } catch (error) {
    console.error('[guestController.verifyMagicLink] Failed.', error);
    return res.status(500).json({ message: 'Failed to verify login link.' });
  }
}

async function getMe(req, res) {
  const guest = await guestAuthService.getGuestById(req.guestId);
  if (!guest) {
    return res.status(404).json({ message: 'Guest not found.' });
  }
  return res.status(200).json({ guest });
}

async function listReservations(req, res) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { guestId: req.guestId },
      orderBy: [{ reservationDate: 'desc' }, { timeFrom: 'desc' }],
      include: {
        table: { select: { id: true, code: true, name: true, bookingKind: true, photoUrl: true } },
        zone: { select: { id: true, name: true } },
        event: { select: { id: true, title: true, slug: true } },
        payment: { select: { id: true, amount: true, currency: true, status: true, paidAt: true } }
      }
    });
    return res.status(200).json({ reservations });
  } catch (error) {
    console.error('[guestController.listReservations] Failed.', error);
    return res.status(500).json({ message: 'Failed to load reservations.' });
  }
}

async function listFavorites(req, res) {
  try {
    const favorites = await prisma.guestFavoriteUnit.findMany({
      where: { guestId: req.guestId },
      include: {
        table: { select: { id: true, code: true, name: true, bookingKind: true, photoUrl: true, seatsMin: true, seatsMax: true, positionType: true } },
        menuItem: { select: { id: true, name: true, price: true, imageUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ favorites });
  } catch (error) {
    console.error('[guestController.listFavorites] Failed.', error);
    return res.status(500).json({ message: 'Failed to load favorites.' });
  }
}

async function addFavorite(req, res) {
  try {
    const kind = req.body.kind === 'menu' ? 'menu' : 'table';
    const tableId = req.body.tableId ? Number(req.body.tableId) : null;
    const menuItemId = req.body.menuItemId ? Number(req.body.menuItemId) : null;
    if (kind === 'menu' && !menuItemId) {
      return res.status(400).json({ message: 'menuItemId is required.' });
    }
    if (kind === 'table' && !tableId) {
      return res.status(400).json({ message: 'tableId is required.' });
    }
    if (kind === 'table') {
      const beachCount = await prisma.guestFavoriteUnit.count({
        where: { guestId: req.guestId, kind: 'table' }
      });
      if (beachCount >= 3) {
        return res.status(400).json({ message: 'Максимум 3 пляжних місця в улюблених.' });
      }
    }
    const where = kind === 'menu'
      ? { guestId_kind_menuItemId: { guestId: req.guestId, kind, menuItemId } }
      : { guestId_kind_tableId: { guestId: req.guestId, kind, tableId } };
    const favorite = await prisma.guestFavoriteUnit.upsert({
      where,
      create: { guestId: req.guestId, kind, tableId, menuItemId },
      update: {}
    });
    return res.status(200).json({ favorite });
  } catch (error) {
    console.error('[guestController.addFavorite] Failed.', error);
    return res.status(500).json({ message: 'Failed to add favorite.' });
  }
}

async function removeFavorite(req, res) {
  try {
    const id = Number(req.params.id);
    if (id) {
      await prisma.guestFavoriteUnit.deleteMany({
        where: { id, guestId: req.guestId }
      });
      return res.status(200).json({ removed: true });
    }
    const kind = req.query.kind === 'menu' ? 'menu' : (req.query.kind === 'table' ? 'table' : null);
    const tableId = req.query.tableId ? Number(req.query.tableId) : null;
    const menuItemId = req.query.menuItemId ? Number(req.query.menuItemId) : null;
    const where = { guestId: req.guestId };
    if (kind === 'menu' && menuItemId) { where.kind = 'menu'; where.menuItemId = menuItemId; }
    else if (kind === 'table' && tableId) { where.kind = 'table'; where.tableId = tableId; }
    else { return res.status(400).json({ message: 'Provide id or kind+tableId/menuItemId.' }); }
    await prisma.guestFavoriteUnit.deleteMany({ where });
    return res.status(200).json({ removed: true });
  } catch (error) {
    console.error('[guestController.removeFavorite] Failed.', error);
    return res.status(500).json({ message: 'Failed to remove favorite.' });
  }
}

async function cancelReservation(req, res) {
  try {
    const reservationId = Number(req.params.id);
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, guestId: true, status: true }
    });
    if (!reservation || reservation.guestId !== req.guestId) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    if (!['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(reservation.status)) {
      return res.status(400).json({ message: 'This reservation can no longer be cancelled.' });
    }
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' }
    });
    return res.status(200).json({ cancelled: true });
  } catch (error) {
    console.error('[guestController.cancelReservation] Failed.', error);
    return res.status(500).json({ message: 'Failed to cancel reservation.' });
  }
}

async function listFavoriteOrders(req, res) {
  try {
    const orders = await prisma.guestFavoriteOrder.findMany({
      where: { guestId: req.guestId },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ orders });
  } catch (error) {
    console.error('[guestController.listFavoriteOrders] Failed.', error);
    return res.status(500).json({ message: 'Failed to load favorite orders.' });
  }
}

async function createFavoriteOrder(req, res) {
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required.' });
    }
    const count = await prisma.guestFavoriteOrder.count({ where: { guestId: req.guestId } });
    const name = req.body.name || `Моє замовлення ${count + 1}`;
    const order = await prisma.guestFavoriteOrder.create({
      data: { guestId: req.guestId, name, items }
    });
    return res.status(201).json({ order });
  } catch (error) {
    console.error('[guestController.createFavoriteOrder] Failed.', error);
    return res.status(500).json({ message: 'Failed to create favorite order.' });
  }
}

async function renameFavoriteOrder(req, res) {
  try {
    const id = Number(req.params.id);
    const name = req.body.name;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'name is required.' });
    }
    await prisma.guestFavoriteOrder.updateMany({
      where: { id, guestId: req.guestId },
      data: { name: name.trim() }
    });
    return res.status(200).json({ renamed: true });
  } catch (error) {
    console.error('[guestController.renameFavoriteOrder] Failed.', error);
    return res.status(500).json({ message: 'Failed to rename favorite order.' });
  }
}

async function deleteFavoriteOrder(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.guestFavoriteOrder.deleteMany({
      where: { id, guestId: req.guestId }
    });
    return res.status(200).json({ removed: true });
  } catch (error) {
    console.error('[guestController.deleteFavoriteOrder] Failed.', error);
    return res.status(500).json({ message: 'Failed to delete favorite order.' });
  }
}

async function getShellBalance(req, res) {
  try {
    const balance = await shellService.getBalance(req.guestId);
    return res.status(200).json({ balance });
  } catch (error) {
    console.error('[guestController.getShellBalance] Failed.', error);
    return res.status(500).json({ message: 'Failed to get shell balance.' });
  }
}

async function getShellHistory(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const history = await shellService.getHistory(req.guestId, { page, limit });
    return res.status(200).json(history);
  } catch (error) {
    console.error('[guestController.getShellHistory] Failed.', error);
    return res.status(500).json({ message: 'Failed to get shell history.' });
  }
}

async function createShellTopup(req, res) {
  try {
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }
    const result = await hutkoService.createShellTopupCheckoutSession({
      guestId: req.guestId,
      amount
    });
    if (result.type === 'NOT_CONFIGURED') {
      return res.status(503).json({ message: result.message });
    }
    if (result.type === 'PROVIDER_ERROR') {
      return res.status(502).json({ message: result.message });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('[guestController.createShellTopup] Failed.', error);
    return res.status(500).json({ message: 'Failed to create shell top-up.' });
  }
}

function classifyWeather(current, daily) {
  const code = current?.weatherCode ?? 3;
  const wind = current?.windSpeed ?? 0;
  const temp = current?.tempAir ?? 25;
  const precipProb = daily?.precipProb ?? 0;
  if (code >= 61 || wind >= 30 || temp < 18 || precipProb >= 60) return 'bad';
  if (code >= 51 || wind >= 20 || temp < 22 || precipProb >= 30) return 'moderate';
  return 'good';
}

function weatherGreeting(mood, locale) {
  const greetings = {
    good: { ua: 'Чудовий день для відпочинку біля моря!', ru: 'Отличный день для отдыха у моря!', en: 'Perfect day for a beach getaway!' },
    moderate: { ua: 'Непоганий день - можна заглянути!', ru: 'Неплохой день - можно заглянуть!', en: 'Decent day - worth a visit!' },
    bad: { ua: 'Сьогодні не найкращий день для пляжу.', ru: 'Сегодня не лучший день для пляжа.', en: 'Not the best beach day today.' }
  };
  return greetings[mood]?.[locale] || greetings.good[locale];
}

function findBestBeachDay(dailyForecast) {
  if (!dailyForecast || !Array.isArray(dailyForecast.tempMax)) return null;
  for (let i = 1; i < Math.min(dailyForecast.tempMax.length, 7); i++) {
    const code = dailyForecast.weatherCode?.[i] ?? 3;
    const precip = dailyForecast.precipitation_probability_max?.[i] ?? 0;
    const temp = dailyForecast.temperature_2m_max?.[i] ?? 0;
    if (code < 61 && precip < 40 && temp >= 22) {
      return {
        date: dailyForecast.time?.[i] || null,
        tempMax: temp,
        precipProb: precip
      };
    }
  }
  return null;
}

function resolveTablePrice(table, dateKey, positionTypeMap = new Map()) {
  const date = new Date(`${dateKey}T12:00:00+03:00`);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const positionType = String(table?.positionType || '').toUpperCase();
  const config = positionTypeMap.get(positionType);
  const candidates = isWeekend
    ? [table?.priceWeekend, table?.price, config?.priceWeekend, config?.defaultPrice]
    : [table?.priceWeekday, table?.price, config?.priceWeekday, config?.defaultPrice];
  const resolved = candidates.map(Number).find((value) => Number.isFinite(value) && value > 0);
  return resolved || 0;
}

async function getWelcome(req, res) {
  try {
    const guestId = req.guestId;

    const [favorites, menuItems, defaultMapData, positionTypes] = await Promise.all([
      prisma.guestFavoriteUnit.findMany({
        where: { guestId },
        include: {
          table: {
            select: {
              id: true,
              code: true,
              name: true,
              bookingKind: true,
              mapId: true,
              positionType: true,
              price: true,
              priceWeekday: true,
              priceWeekend: true
            }
          },
          menuItem: { select: { id: true, name: true, price: true, isAvailable: true } }
        }
      }),
      prisma.menuItem.findMany({
        where: { isActive: true },
        select: { id: true, isAvailable: true, name: true }
      }),
      contentService.getDefaultMap(),
      prisma.positionType.findMany({ where: { isActive: true } })
    ]);
    const positionTypeMap = new Map(positionTypes.map((item) => [String(item.value).toUpperCase(), item]));

    const favoriteTables = favorites.filter((f) => f.kind === 'table' && f.table);
    const favoriteDishes = favorites.filter((f) => f.kind === 'menu' && f.menuItem);

    let tableStatuses = [];
    if (defaultMapData && favoriteTables.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      try {
        const availability = await reservationService.getMapAvailability({
          mapId: favoriteTables[0]?.table?.mapId || defaultMapData.map.id,
          reservationDate: today,
          timeFrom: toDateTime(today, '12:00'),
          timeTo: toDateTime(today, '20:00')
        });
        const busySet = new Set(availability.busyTableIds || []);
        const heldSet = new Set(availability.heldTableIds || []);
        tableStatuses = favoriteTables.map((fav) => {
          const tid = fav.tableId;
          const isBeach = fav.table?.bookingKind === 'BEACH' || ['BUNGALOW', 'KROVAT', 'PIER'].includes(fav.table?.positionType);
          return {
            tableId: tid,
            name: fav.table?.name || fav.table?.code || `#${tid}`,
            bookingKind: fav.table?.bookingKind || 'BEACH',
            positionType: fav.table?.positionType || null,
            price: resolveTablePrice(fav.table, today, positionTypeMap),
            isBeach,
            status: busySet.has(tid) ? 'busy' : heldSet.has(tid) ? 'held' : 'free'
          };
        });
      } catch (err) {
        console.error('[guestController.getWelcome] Availability check failed.', err.message);
        tableStatuses = favoriteTables.map((fav) => {
          const isBeach = fav.table?.bookingKind === 'BEACH' || ['BUNGALOW', 'KROVAT', 'PIER'].includes(fav.table?.positionType);
          return {
            tableId: fav.tableId,
            name: fav.table?.name || fav.table?.code || `#${fav.tableId}`,
            bookingKind: fav.table?.bookingKind || 'BEACH',
            positionType: fav.table?.positionType || null,
            price: resolveTablePrice(fav.table, today, positionTypeMap),
            isBeach,
            status: 'unknown'
          };
        });
      }
    }

    const dishStatuses = favoriteDishes.map((fav) => {
      const mi = menuItems.find((m) => m.id === fav.menuItemId);
      return {
        menuItemId: fav.menuItemId,
        name: fav.menuItem?.name || `#${fav.menuItemId}`,
        isAvailable: mi ? mi.isAvailable : false
      };
    });

    let weather = null;
    try {
      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=46.4653&longitude=30.7625&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=7';
      const marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=46.4653&longitude=30.7625&current=sea_surface_temperature&timezone=auto&forecast_days=1&cell_selection=sea';
      const [wRes, mRes] = await Promise.allSettled([
        fetch(weatherUrl).then((r) => r.json()),
        fetch(marineUrl).then((r) => r.json())
      ]);
      const wd = wRes.status === 'fulfilled' ? wRes.value : null;
      const md = mRes.status === 'fulfilled' ? mRes.value : null;
      if (wd) {
        const current = {
          tempAir: wd.current?.temperature_2m ?? null,
          windSpeed: wd.current?.wind_speed_10m ?? null,
          weatherCode: wd.current?.weather_code ?? null,
          isDay: wd.current?.is_day ?? null,
          humidity: wd.current?.relative_humidity_2m ?? null,
          tempWater: md?.current?.sea_surface_temperature ?? null
        };
        const daily = {
          tempMax: wd.daily?.temperature_2m_max?.[0] ?? null,
          tempMin: wd.daily?.temperature_2m_min?.[0] ?? null,
          precipProb: wd.daily?.precipitation_probability_max?.[0] ?? null,
          uvMax: wd.daily?.uv_index_max?.[0] ?? null
        };
        const mood = classifyWeather(current, daily);
        const bestDay = findBestBeachDay(wd.daily);
        weather = { current, daily, mood, bestDay };
      }
    } catch (err) {
      console.error('[guestController.getWelcome] Weather fetch failed.', err.message);
    }

    const anyBusy = tableStatuses.some((t) => t.status === 'busy' || t.status === 'held');
    const anyDishUnavailable = dishStatuses.some((d) => !d.isAvailable);
    const isBadWeather = weather?.mood === 'bad';

    const suggestions = [];
    if (isBadWeather) {
      suggestions.push({
        type: 'reschedule',
        message: 'Обрати інший день для відпочинку',
        link: '/booking'
      });
    }
    if (anyBusy) {
      suggestions.push({
        type: 'other_table',
        message: 'Обрати інший столик',
        link: '/booking'
      });
    }
    if (anyDishUnavailable) {
      suggestions.push({
        type: 'other_dish',
        message: 'Подивитись альтернативи в меню',
        link: '/menu'
      });
    }
    if (!anyBusy && !anyDishUnavailable && !isBadWeather) {
      suggestions.push({
        type: 'book',
        message: 'Забронювати зараз',
        link: '/booking'
      });
      suggestions.push({
        type: 'menu',
        message: 'Переглянути меню',
        link: '/menu'
      });
    }

    return res.status(200).json({
      weather: weather ? {
        mood: weather.mood,
        greeting: weatherGreeting(weather.mood, 'ua'),
        tempAir: weather.current.tempAir,
        tempWater: weather.current.tempWater,
        windSpeed: weather.current.windSpeed,
        precipProb: weather.daily?.precipProb,
        bestDay: weather.bestDay
      } : null,
      favoriteTables: tableStatuses,
      favoriteDishes: dishStatuses,
      suggestions
    });
  } catch (error) {
    console.error('[guestController.getWelcome] Failed.', error);
    return res.status(500).json({ message: 'Failed to load welcome data.' });
  }
}

function roundUpToSlot(date) {
  const m = date.getMinutes();
  if (m <= 0) date.setMinutes(0, 0, 0);
  else if (m <= 30) date.setMinutes(30, 0, 0);
  else { date.setHours(date.getHours() + 1); date.setMinutes(0, 0, 0); }
  return date;
}

function addHours(date, h) {
  const d = new Date(date);
  d.setHours(d.getHours() + h);
  return d;
}

async function getEveningBeach(req, res) {
  try {
    const guestId = req.guestId;
    const clock = getVenueClockParts();
    const cutoffMinutes = 17 * 60;
    const isToday = clock.minutes < cutoffMinutes;
    const targetDate = isToday ? clock.dateKey : (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return getVenueClockParts(d).dateKey;
    })();

    const [favorites, positionTypes] = await Promise.all([
      prisma.guestFavoriteUnit.findMany({
        where: { guestId, kind: 'table' },
        include: {
          table: { select: { id: true, code: true, name: true, bookingKind: true, mapId: true, zoneId: true, seatsMin: true, price: true, priceWeekday: true, priceWeekend: true, positionType: true } }
        }
      }),
      prisma.positionType.findMany({ where: { isActive: true } })
    ]);
    const positionTypeMap = new Map(positionTypes.map((item) => [String(item.value).toUpperCase(), item]));

    const beachFavorites = favorites.filter((f) => f.table && (f.table.bookingKind === 'BEACH' || ['BUNGALOW', 'KROVAT', 'PIER'].includes(f.table.positionType)));

    if (beachFavorites.length === 0) {
      return res.status(200).json({ date: targetDate, isToday, cutoffPassed: !isToday, beds: [] });
    }

    let busySet = new Set();
    let heldSet = new Set();

    const beachMapId = beachFavorites[0]?.table?.mapId;
    if (beachMapId) {
      try {
        const availability = await reservationService.getMapAvailability({
          mapId: beachMapId,
          reservationDate: targetDate,
          timeFrom: toDateTime(targetDate, '09:00'),
          timeTo: toDateTime(targetDate, '20:00')
        });
        busySet = new Set(availability.busyTableIds || []);
        heldSet = new Set(availability.heldTableIds || []);
      } catch (err) {
        console.error('[guestController.getEveningBeach] Availability check failed.', err.message);
      }
    }

    let computedTimeFrom = null;
    if (isToday) {
      const now = new Date();
      const rounded = roundUpToSlot(new Date(now));
      const arrival = addHours(rounded, 1);
      computedTimeFrom = `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`;
    }

    const beds = beachFavorites.map((fav) => {
      const t = fav.table;
      const isBusy = busySet.has(t.id) || heldSet.has(t.id);
      const price = resolveTablePrice(t, targetDate, positionTypeMap);
      return {
        tableId: t.id,
        name: t.code || t.name || `#${t.id}`,
        positionType: t.positionType || 'KROVAT',
        price,
        status: isBusy ? 'busy' : 'free',
        mapId: t.mapId,
        zoneId: t.zoneId,
        seatsMin: t.seatsMin || 1
      };
    });

    return res.status(200).json({
      date: targetDate,
      isToday,
      cutoffPassed: !isToday,
      computedTimeFrom,
      beds
    });
  } catch (error) {
    console.error('[guestController.getEveningBeach] Failed.', error);
    return res.status(500).json({ message: 'Failed to load evening beach data.' });
  }
}

async function purchaseEveningBeach(req, res) {
  try {
    const guestId = req.guestId;
    const tableId = Number(req.body.tableId);
    if (!tableId) {
      return res.status(400).json({ message: 'tableId is required.' });
    }

    const clock = getVenueClockParts();
    if (clock.minutes >= 17 * 60) {
      return res.status(400).json({ message: 'Покупка можлива лише до 17:00.' });
    }

    const favorite = await prisma.guestFavoriteUnit.findFirst({
      where: { guestId, kind: 'table', tableId },
      include: { table: true }
    });
    if (!favorite || !favorite.table) {
      return res.status(400).json({ message: 'Кровать не в улюблених.' });
    }

    const table = favorite.table;
    const availability = await reservationService.getMapAvailability({
      mapId: table.mapId,
      reservationDate: clock.dateKey,
      timeFrom: toDateTime(clock.dateKey, '09:00'),
      timeTo: toDateTime(clock.dateKey, '20:00')
    });
    const busySet = new Set(availability.busyTableIds || []);
    const heldSet = new Set(availability.heldTableIds || []);
    if (busySet.has(tableId) || heldSet.has(tableId)) {
      return res.status(409).json({ message: 'Кровать вже зайнята.' });
    }

    const now = new Date();
    const rounded = roundUpToSlot(new Date(now));
    const arrival = addHours(rounded, 1);
    const timeFrom = arrival;
    const timeTo = toDateTime(clock.dateKey, '20:00');

    if (arrival >= timeTo) {
      return res.status(400).json({ message: 'Вже занадто пізно для покупки.' });
    }

    const guest = await guestAuthService.getGuestById(guestId);
    const positionType = table.positionType
      ? await prisma.positionType.findUnique({ where: { value: table.positionType } })
      : null;
    const positionTypeMap = new Map(positionType ? [[String(positionType.value).toUpperCase(), positionType]] : []);
    const price = resolveTablePrice(table, clock.dateKey, positionTypeMap);
    if (price <= 0) {
      return res.status(409).json({ message: 'Ціну для цього пляжного місця не налаштовано.' });
    }

    const ticketCode = generateTicketCode();
    const holdResult = await reservationService.createTableHold({
      tableId: table.id,
      reservationDate: new Date(clock.dateKey + 'T00:00:00+03:00'),
      timeFrom,
      timeTo,
      locale: 'ua'
    });

    const reservation = await reservationService.createReservation({
      tableId: table.id,
      mapId: table.mapId,
      zoneId: table.zoneId,
      bookingKind: 'BEACH',
      customerName: guest?.name || '',
      customerPhone: guest?.phone || '',
      customerEmail: guest?.email || null,
      guests: table.seatsMin || 1,
      reservationDate: new Date(clock.dateKey + 'T00:00:00+03:00'),
      timeFrom,
      timeTo,
      rentalAmount: price,
      depositRequired: false,
      source: 'WEB',
      status: 'PENDING',
      guestId,
      ticketCode
    });

    await reservationService.consumeTableHold(holdResult.holdToken, reservation.id);

    const payment = await hutkoService.createCheckoutSession({
      reservationId: reservation.id,
      amount: price,
      description: `Бронювання ${table.code || table.id} на ${clock.dateKey}`,
      customerEmail: guest?.email || null,
      customerPhone: guest?.phone || null,
      returnTo: '/cabinet'
    });

    if (payment.type === 'NOT_CONFIGURED') {
      return res.status(503).json({ message: 'Оплата не налаштована.' });
    }
    if (payment.type === 'PROVIDER_ERROR') {
      return res.status(502).json({ message: 'Помилка платіжної системи.' });
    }

    return res.status(200).json({ checkoutUrl: payment.checkoutUrl, reservationId: reservation.id });
  } catch (error) {
    console.error('[guestController.purchaseEveningBeach] Failed.', error);
    return res.status(500).json({ message: 'Failed to purchase beach bed.' });
  }
}

module.exports = {
  requestMagicLink,
  verifyMagicLink,
  getMe,
  listReservations,
  listFavorites,
  addFavorite,
  removeFavorite,
  cancelReservation,
  listFavoriteOrders,
  createFavoriteOrder,
  renameFavoriteOrder,
  deleteFavoriteOrder,
  getShellBalance,
  getShellHistory,
  createShellTopup,
  getWelcome,
  getEveningBeach,
  purchaseEveningBeach
};
