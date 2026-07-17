export function toDateKeyFromLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return toDateKeyFromLocalDate(date);
}

export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  const d = digits.startsWith('38') ? digits.slice(2) : digits;
  let out = '+38 (0';
  if (d.length > 1) out += d.slice(1, 3);
  if (d.length > 3) out += ') ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return d.length > 1 ? out : '+38 (0';
}

export function money(value, currency = 'UAH') {
  return `${Number(value || 0).toFixed(0)} ${currency}`;
}

export function getUnitDisplayName(unit, locale) {
  if (!unit) return '';
  const name = unit.name || unit.label;
  if (!name) return unit.code || unit.id || '';
  if (typeof name === 'string') return name;
  return name[locale] || name.ua || name.ru || name.en || unit.code || '';
}

export function formatUkrainianDate(value, { weekday = false } = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    weekday: weekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function bookingKindTitle(value, c) {
  return value === 'BEACH'
    ? c({ ua: 'Пляжний відпочинок', ru: 'Пляжный отдых', en: 'Beach leisure' })
    : c({ ua: 'Стіл', ru: 'Стол', en: 'Table' });
}

export function unitStatusLabel(status, c) {
  if (status === 'free') return c({ ua: 'Вільно', ru: 'Свободно', en: 'Free' });
  if (status === 'held') return c({ ua: 'Утримується', ru: 'Удерживается', en: 'Held' });
  if (status === 'busy') return c({ ua: 'Зайнято', ru: 'Занято', en: 'Busy' });
  return c({ ua: 'Недоступно', ru: 'Недоступно', en: 'Unavailable' });
}

export function getPositionType(value, positionTypes) {
  return positionTypes.find((pt) => pt.value?.toUpperCase() === String(value || '').toUpperCase()) || null;
}

export function positionTypeLabel(value, positionTypes, locale, localizedCopy) {
  const pt = getPositionType(value, positionTypes);
  if (pt) return localizedCopy(pt.name, locale);
  return String(value || '');
}

export function findEventForDate(events, date) {
  const selectedDate = toLocalDateKey(date);
  if (!selectedDate || !Array.isArray(events)) return null;

  return events.find((event) => {
    const start = toLocalDateKey(event?.startAt);
    const end = toLocalDateKey(event?.endAt);
    if (!start) return false;
    const last = end || start;
    return selectedDate >= start && selectedDate <= last;
  }) || null;
}

export function getEventDateRange(event) {
  const start = toLocalDateKey(event?.startAt);
  if (!start) return [];
  const end = toLocalDateKey(event?.endAt);
  if (!end || end === start) return [start];
  return [start, end].filter(Boolean);
}

export function formatEventRangeLabel(event) {
  const start = toLocalDateKey(event?.startAt);
  if (!start) return '';
  const end = toLocalDateKey(event?.endAt);
  if (!end || end === start) {
    return formatUkrainianDate(event.startAt, { weekday: true });
  }
  return `${formatUkrainianDate(event.startAt, { weekday: true })} · ${formatUkrainianDate(event.endAt, { weekday: true })}`;
}

export function formatEventButtonLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const weekday = date.toLocaleDateString('uk-UA', { weekday: 'long' });
  const dayMonth = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}

export function buildEventDateOptions(event) {
  const todayStr = toDateKeyFromLocalDate(new Date());

  const sessions = Array.isArray(event?.sessions)
    ? event.sessions.filter((session) => session?.isActive !== false && session?.startsAt)
    : [];

  if (sessions.length) {
    const grouped = new Map();
    sessions.forEach((session) => {
      const sessionDate = new Date(session.startsAt);
      const dateKey = toDateKeyFromLocalDate(sessionDate);
      if (!dateKey || dateKey < todayStr) return;
      const current = grouped.get(dateKey);
      if (!current) {
        grouped.set(dateKey, {
          key: dateKey,
          date: dateKey,
          sessionId: session.id,
          sessionName: session.name,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          timeFrom: toTimeOnly(session.startsAt) || '12:00',
          label: formatEventButtonLabel(session.startsAt),
          fullLabel: formatUkrainianDate(session.startsAt)
        });
        return;
      }
      if (new Date(session.startsAt) < new Date(current.startsAt)) {
        current.startsAt = session.startsAt;
        current.sessionId = session.id;
        current.sessionName = session.name;
        current.endsAt = session.endsAt;
        current.timeFrom = toTimeOnly(session.startsAt) || current.timeFrom;
        current.label = formatEventButtonLabel(session.startsAt);
        current.fullLabel = formatUkrainianDate(session.startsAt);
      }
    });
    return Array.from(grouped.values()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  }

  if (!event?.startAt) return [];

  const start = new Date(event.startAt);
  const end = event?.endAt ? new Date(event.endAt) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const options = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cursor <= last) {
    const cursorKey = toDateKeyFromLocalDate(cursor);
    if (cursorKey >= todayStr) {
      options.push({
        key: cursorKey,
        date: cursorKey,
        startsAt: event.startAt,
        timeFrom: toTimeOnly(event.startAt) || '12:00',
        label: formatEventButtonLabel(cursor),
        fullLabel: formatUkrainianDate(cursor)
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return options;
}

function toTimeOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.hour}:${obj.minute}`;
}
