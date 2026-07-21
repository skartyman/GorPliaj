const { VENUE_CLOSING_TIME } = require('../config/env');

const CLOSING_TIME_FALLBACK = '23:59';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VENUE_TIME_ZONE = 'Europe/Kyiv';

function parseDateKey(datePart) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datePart || ''));
  if (!match) throw new Error(`Invalid venue date: ${datePart}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTimeKey(timePart) {
  const match = TIME_PATTERN.exec(String(timePart || ''));
  if (!match) throw new Error(`Invalid venue time: ${timePart}`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function getTimeZoneOffsetMs(date, timeZone = VENUE_TIME_ZONE) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function getClosingTimeString() {
  return TIME_PATTERN.test(VENUE_CLOSING_TIME) ? VENUE_CLOSING_TIME : CLOSING_TIME_FALLBACK;
}

function toDateTime(datePart, timePart) {
  const { year, month, day } = parseDateKey(datePart);
  const { hour, minute } = parseTimeKey(timePart);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let result = new Date(wallClockUtc - getTimeZoneOffsetMs(new Date(wallClockUtc)));
  result = new Date(wallClockUtc - getTimeZoneOffsetMs(result));
  return result;
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
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

function addVenueDays(dateKey, amount) {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + Number(amount || 0), 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function minutesToTimeKey(value) {
  const minutes = ((Number(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function getVenueDateRange(dateKey) {
  return {
    start: toDateTime(dateKey, '00:00'),
    end: toDateTime(addVenueDays(dateKey, 1), '00:00')
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
  addVenueDays,
  minutesToTimeKey,
  getVenueDateRange,
  kyivToday,
  kyivNow,
  VENUE_TIME_ZONE
};
