const { VENUE_CLOSING_TIME } = require('../config/env');

const CLOSING_TIME_FALLBACK = '23:59';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VENUE_TIME_ZONE = 'Europe/Kyiv';
const VENUE_UTC_OFFSET = '+03:00';

function getClosingTimeString() {
  return TIME_PATTERN.test(VENUE_CLOSING_TIME) ? VENUE_CLOSING_TIME : CLOSING_TIME_FALLBACK;
}

function toDateTime(datePart, timePart) {
  return new Date(`${datePart}T${timePart}:00${VENUE_UTC_OFFSET}`);
}

function getClosingDateTime(datePart) {
  const closingTime = getClosingTimeString();
  return toDateTime(datePart, closingTime);
}

function getVenueClockParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VENUE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeKey: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function kyivToday() {
  return getVenueClockParts().dateKey;
}

function kyivNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: VENUE_TIME_ZONE }).replace(' ', 'T');
}

module.exports = {
  getClosingDateTime,
  getClosingTimeString,
  toDateTime,
  getVenueClockParts,
  kyivToday,
  kyivNow,
  VENUE_TIME_ZONE,
  VENUE_UTC_OFFSET
};
