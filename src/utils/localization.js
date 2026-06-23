const LOCALES = ['ua', 'ru', 'en'];
const INVALID_TEXT_VALUES = new Set(['[object Object]', 'object Object', '[object object]', 'undefined', 'null']);

function cleanText(value) {
  if (value == null) return '';

  if (typeof value === 'object') {
    return localizeField(value, 'ua');
  }

  const text = String(value).trim();
  return INVALID_TEXT_VALUES.has(text) ? '' : text;
}

function normalizeLocalizedField(value) {
  if (value == null) {
    return { ua: '', ru: '', en: '' };
  }

  if (typeof value === 'string') {
    const text = cleanText(value);
    return { ua: text, ru: text, en: text };
  }

  if (typeof value !== 'object') {
    const text = cleanText(value);
    return { ua: text, ru: text, en: text };
  }

  const normalized = {
    ua: cleanText(value.ua ?? value.uk ?? value.ru ?? value.en),
    ru: cleanText(value.ru),
    en: cleanText(value.en)
  };

  for (const locale of LOCALES) {
    if (!normalized[locale]) {
      normalized[locale] = normalized.ua || normalized.ru || normalized.en || '';
    }
  }

  return normalized;
}

function localizeField(value, locale = 'ua') {
  const normalized = normalizeLocalizedField(value);
  return normalized[locale] || normalized.ua || normalized.ru || normalized.en || '';
}

const MESSAGES = {
  'hold.conflict.reservation': {
    ua: 'Ця позиція вже заброньована на обраний час.',
    ru: 'Эта позиция уже забронирована на выбранное время.',
    en: 'This position is already booked for the selected time.'
  },
  'hold.conflict.hold': {
    ua: 'Цю позицію тимчасово утримує інший відвідувач.',
    ru: 'Эту позицию временно удерживает другой посетитель.',
    en: 'This position is temporarily held by another visitor.'
  },
  'hold.invalid.params': {
    ua: 'Некоректні параметри для утримання позиції.',
    ru: 'Некорректные параметры для удержания позиции.',
    en: 'Invalid hold parameters.'
  },
  'hold.time.order': {
    ua: 'Час початку має бути до часу завершення.',
    ru: 'Время начала должно быть до времени завершения.',
    en: 'Start time must be before end time.'
  },
  'reservation.conflict': {
    ua: 'Ця позиція вже зайнята на обраний час.',
    ru: 'Эта позиция уже занята на выбранное время.',
    en: 'This position is already booked for the selected time.'
  },
  'general.error': {
    ua: 'Сталася помилка. Спробуйте ще раз.',
    ru: 'Произошла ошибка. Попробуйте еще раз.',
    en: 'An error occurred. Please try again.'
  }
};

function localizeMessage(key, locale = 'ua') {
  const msg = MESSAGES[key];
  if (!msg) return key;
  return msg[locale] || msg.ua || msg.en || key;
}

module.exports = {
  LOCALES,
  cleanText,
  localizeField,
  normalizeLocalizedField,
  localizeMessage
};
