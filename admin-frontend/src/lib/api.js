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
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale);
}

export function formatDateTime(value, locale = 'ru-RU') {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale);
}

export function formatTime(value, locale = 'ru-RU') {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function localizeField(value, locale = 'ua') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.ua || value.ru || value.en || '';
}
