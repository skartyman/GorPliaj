export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: isFormData
        ? { ...(options.headers || {}) }
        : {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          },
      ...options
    });

    const body = await response.json().catch(() => ({}));
    return { response, body };
  } catch (error) {
    return {
      response: {
        ok: false,
        status: 0,
        statusText: 'NETWORK_ERROR'
      },
      body: {
        message: error?.message || 'Network request failed.'
      }
    };
  }
}

export function formatDate(value, locale = 'ru-RU') {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(locale, { timeZone: 'Europe/Kyiv' });
}

export function formatDateTime(value, locale = 'ru-RU') {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(locale, { timeZone: 'Europe/Kyiv' });
}

export function formatTime(value, locale = 'ru-RU') {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' });
}

const invalidTextValues = new Set(['[object Object]', 'object Object', '[object object]', 'undefined', 'null']);

export function cleanText(value) {
  if (value == null) return '';
  if (typeof value === 'object') return localizeField(value, 'ua');
  const text = String(value).trim();
  return invalidTextValues.has(text) ? '' : text;
}

export function normalizeLocalizedField(value) {
  if (value == null) return { ua: '', ru: '', en: '' };
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

  for (const key of ['ua', 'ru', 'en']) {
    if (!normalized[key]) {
      normalized[key] = normalized.ua || normalized.ru || normalized.en || '';
    }
  }

  return normalized;
}

export function localizeField(value, locale = 'ua') {
  const normalized = normalizeLocalizedField(value);
  return normalized[locale] || normalized.ua || normalized.ru || normalized.en || '';
}
