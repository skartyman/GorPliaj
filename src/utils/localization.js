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

module.exports = {
  LOCALES,
  cleanText,
  localizeField,
  normalizeLocalizedField
};
