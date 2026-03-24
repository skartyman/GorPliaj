export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;

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
