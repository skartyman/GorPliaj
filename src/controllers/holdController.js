const reservationService = require('../services/reservationService');
const { getClosingDateTime, toDateTime, VENUE_UTC_OFFSET } = require('../utils/venueTime');
const { localizeMessage } = require('../utils/localization');

function normalizeText(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function getLocale(req) {
  return req.body?.locale || req.query?.locale || 'ua';
}

async function createHold(req, res) {
  const locale = getLocale(req);
  try {
    const tableId = Number(req.body.tableId);
    const tableIds = Array.isArray(req.body.tableIds)
      ? [...new Set(req.body.tableIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
      : [];
    const reservationDate = new Date(`${normalizeText(req.body.date)}T00:00:00${VENUE_UTC_OFFSET}`);
    const timeFrom = toDateTime(req.body.date, normalizeText(req.body.timeFrom));
    const timeTo = req.body.timeTo
      ? toDateTime(req.body.date, normalizeText(req.body.timeTo))
      : getClosingDateTime(req.body.date);

    if ((!tableId && !tableIds.length) || Number.isNaN(reservationDate.getTime()) || Number.isNaN(timeFrom.getTime()) || Number.isNaN(timeTo.getTime())) {
      return res.status(400).json({ message: localizeMessage('hold.invalid.params', locale) });
    }

    if (timeFrom >= timeTo) {
      return res.status(400).json({ message: localizeMessage('hold.time.order', locale) });
    }

    const hold = tableIds.length > 1
      ? await reservationService.createTableHolds({ tableIds, reservationDate, timeFrom, timeTo, locale })
      : await reservationService.createTableHold({
        tableId: tableIds[0] || tableId,
        reservationDate,
        timeFrom,
        timeTo,
        locale
      });

    return res.status(201).json(hold);
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ message: error.message });
    }
    console.error('[holdController.createHold] Failed to create hold.', error);
    return res.status(500).json({ message: localizeMessage('general.error', locale) || 'Unable to create hold.' });
  }
}

async function releaseHold(req, res) {
  try {
    const locale = getLocale(req);
    const holdToken = normalizeText(req.params.holdToken);
    if (!holdToken) {
      return res.status(400).json({ message: localizeMessage('hold.invalid.params', locale) });
    }

    await reservationService.releaseTableHold(holdToken);
    return res.json({ success: true });
  } catch (error) {
    console.error('[holdController.releaseHold] Failed to release hold.', error);
    return res.status(500).json({ message: 'Unable to release hold.' });
  }
}

module.exports = { createHold, releaseHold };
