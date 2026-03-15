const contentService = require('../services/contentService');
const reservationService = require('../services/reservationService');

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

function toDateTime(datePart, timePart) {
  return new Date(`${datePart}T${timePart}:00`);
}

async function getMapAvailability(req, res) {
  try {
    const mapId = Number(req.params.mapId);
    const { date, timeFrom, timeTo } = req.query;

    if (!mapId || !date || !timeFrom || !timeTo) {
      return res.status(400).json({ message: 'Потрібні параметри mapId, date, timeFrom, timeTo.' });
    }

    const reservationDate = new Date(`${date}T00:00:00`);
    const dateTimeFrom = toDateTime(date, timeFrom);
    const dateTimeTo = toDateTime(date, timeTo);

    if (
      Number.isNaN(reservationDate.getTime()) ||
      Number.isNaN(dateTimeFrom.getTime()) ||
      Number.isNaN(dateTimeTo.getTime())
    ) {
      return res.status(400).json({ message: 'Некоректні дата або час.' });
    }

    if (dateTimeFrom >= dateTimeTo) {
      return res.status(400).json({ message: 'Час завершення має бути пізніше за час початку.' });
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

module.exports = {
  getDefaultMap,
  getMapAvailability
};
