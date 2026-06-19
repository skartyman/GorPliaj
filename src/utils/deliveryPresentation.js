const { normalizeLocalizedField } = require('./localization');

function getBaseUrl() {
  return process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
}

function localizedText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const normalized = normalizeLocalizedField(value);
  return normalized.ua || normalized.ru || normalized.en || '';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value, locale = 'uk-UA') {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatTime(value, locale = 'uk-UA') {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateTime(value, locale = 'uk-UA') {
  if (!value) return '';
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatMoney(amount, currency = 'UAH', locale = 'uk-UA') {
  const numeric = Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(0)} ${currency}`;
  }
}

module.exports = {
  getBaseUrl,
  localizedText,
  escapeHtml,
  formatDate,
  formatTime,
  formatDateTime,
  formatMoney
};
