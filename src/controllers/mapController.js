const contentService = require('../services/contentService');
const bookableUnitService = require('../services/bookableUnitService');
const reservationService = require('../services/reservationService');
const { getClosingDateTime, toDateTime } = require('../utils/venueTime');

async function listPublicMaps(req, res) {
  try {
    const usageMode = String(req.query.usageMode || '').trim().toUpperCase() || null;
    const bookingKind = String(req.query.bookingKind || '').trim().toUpperCase() || null;
    const guests = Number(req.query.guests || 0);
    const maps = await bookableUnitService.listPublicBookingMaps({
      usageMode,
      bookingKind,
      guests
    });

    return res.json({ maps });
  } catch (error) {
    console.error('[mapController.listPublicMaps] Failed to load booking maps.', error);
    return res.status(500).json({ message: 'Failed to load booking maps.' });
  }
}

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

async function getMapById(req, res) {
  try {
    const mapId = Number(req.params.mapId);
    const map = await contentService.getMapById(mapId);

    if (!map) {
      return res.status(404).json({ message: 'Map not found.' });
    }

    return res.json(map);
  } catch (error) {
    console.error('[mapController.getMapById] Failed to load map.', error);
    return res.status(500).json({ message: 'Failed to load map.' });
  }
}

async function getMapAvailability(req, res) {
  try {
    const mapId = Number(req.params.mapId);
    const { date, timeFrom } = req.query;

    if (!mapId || !date || !timeFrom) {
      return res.status(400).json({ message: 'Потрібні параметри mapId, date, timeFrom.' });
    }

    const reservationDate = new Date(`${date}T00:00:00`);
    const dateTimeFrom = toDateTime(date, timeFrom);
    const dateTimeTo = getClosingDateTime(date);

    if (
      Number.isNaN(reservationDate.getTime()) ||
      Number.isNaN(dateTimeFrom.getTime()) ||
      Number.isNaN(dateTimeTo.getTime())
    ) {
      return res.status(400).json({ message: 'Некоректні дата або час.' });
    }

    if (dateTimeFrom >= dateTimeTo) {
      return res.status(400).json({ message: 'Час початку має бути раніше за час закриття закладу.' });
    }

    const availability = await reservationService.getMapAvailability({
      mapId,
      reservationDate,
      timeFrom: dateTimeFrom,
      timeTo: dateTimeTo
    });

    return res.json(availability);
  } catch (error) {
    console.error('[mapController.getMapAvailability] Failed to load map availability.', error);
    return res.status(500).json({ message: 'Не вдалося завантажити доступність столів.' });
  }
}

async function getMapBookableUnits(req, res) {
  try {
    const mapId = Number(req.params.mapId);
    const { date, timeFrom, guests, bookingKind, zoneId } = req.query;

    if (!mapId || !date || !timeFrom) {
      return res.status(400).json({ message: 'Required parameters: mapId, date, timeFrom.' });
    }

    const reservationDate = new Date(`${date}T00:00:00`);
    const dateTimeFrom = toDateTime(date, timeFrom);
    const dateTimeTo = getClosingDateTime(date);

    if (
      Number.isNaN(reservationDate.getTime())
      || Number.isNaN(dateTimeFrom.getTime())
      || Number.isNaN(dateTimeTo.getTime())
    ) {
      return res.status(400).json({ message: 'Invalid date or time.' });
    }

    const result = await bookableUnitService.getMapBookableUnits({
      mapId,
      reservationDate,
      timeFrom: dateTimeFrom,
      timeTo: dateTimeTo,
      guests: Number(guests || 0),
      bookingKind: String(bookingKind || '').trim().toUpperCase() || null,
      zoneId: Number(zoneId || 0) || null
    });

    if (!result) {
      return res.status(404).json({ message: 'Map not found.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('[mapController.getMapBookableUnits] Failed to load bookable units.', error);
    return res.status(500).json({ message: 'Failed to load bookable units.' });
  }
}

module.exports = {
  listPublicMaps,
  getDefaultMap,
  getMapById,
  getMapAvailability,
  getMapBookableUnits
};
