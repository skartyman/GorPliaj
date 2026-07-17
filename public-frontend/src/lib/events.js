export function formatEventDateRange(startAt, endAt, locale = 'uk-UA') {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    return '-';
  }

  const startText = start.toLocaleString(locale, {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (!endAt) {
    return startText;
  }

  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) {
    return startText;
  }

  return `${startText} - ${end.toLocaleString(locale, {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}
