const { VENUE_CLOSING_TIME } = require('../config/env');

const CLOSING_TIME_FALLBACK = '23:59';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function getClosingTimeString() {
  return TIME_PATTERN.test(VENUE_CLOSING_TIME) ? VENUE_CLOSING_TIME : CLOSING_TIME_FALLBACK;
}

function toDateTime(datePart, timePart) {
  return new Date(`${datePart}T${timePart}:00`);
}

function getClosingDateTime(datePart) {
  const closingTime = getClosingTimeString();
  return toDateTime(datePart, closingTime);
}

module.exports = {
  getClosingDateTime,
  getClosingTimeString,
  toDateTime
};
