function formatEventDateRange(startAt, endAt, locale = 'uk-UA') {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  if (Number.isNaN(start.getTime())) return '—';

  const startText = start.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (!end || Number.isNaN(end.getTime())) return startText;

  const endText = end.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${startText} — ${endText}`;
}

function buildCtas(event) {
  const ctas = [];
  if (event.ctaType === 'BOOKING' || event.ctaType === 'BOTH') {
    ctas.push(`<a class="btn btn-primary" href="/booking?event=${encodeURIComponent(event.slug)}">Забронювати столик</a>`);
  }

  if ((event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl) {
    ctas.push(`<a class="btn btn-secondary" href="${event.ticketUrl}" target="_blank" rel="noopener noreferrer">Купити квиток</a>`);
  }

  return ctas.join('');
}

function eventCardMarkup(event) {
  return `
    <article class="event-card">
      <a class="event-card-media" href="/events/${event.slug}">
        <img src="${event.posterImage || '/icons/lebedi.jpg'}" alt="${event.title}" loading="lazy" />
      </a>
      <div class="event-card-body">
        <p class="event-date">${formatEventDateRange(event.startAt, event.endAt)}</p>
        <h3><a href="/events/${event.slug}">${event.title}</a></h3>
        <p class="menu-page-description">${event.shortDescription || ''}</p>
        <div class="event-card-actions">${buildCtas(event)}</div>
      </div>
    </article>
  `;
}

async function renderEventsListPage() {
  const listElement = document.getElementById('eventsList');
  if (!listElement) return;

  const emptyElement = document.getElementById('eventsListEmpty');
  const response = await fetch('/api/events?includePast=1');
  const events = await response.json();

  if (!response.ok || !Array.isArray(events) || !events.length) {
    if (emptyElement) emptyElement.hidden = false;
    listElement.innerHTML = '';
    return;
  }

  listElement.innerHTML = events.map(eventCardMarkup).join('');
}

async function renderSingleEventPage() {
  const detailsElement = document.getElementById('eventDetails');
  if (!detailsElement) return;

  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  const errorElement = document.getElementById('eventDetailsError');
  const response = await fetch(`/api/events/${encodeURIComponent(slug)}`);
  const event = await response.json();

  if (!response.ok || !event?.id) {
    if (errorElement) errorElement.hidden = false;
    detailsElement.innerHTML = '';
    return;
  }

  document.title = `${event.title} — ГорПляж`;
  detailsElement.innerHTML = `
    <div class="event-details-media">
      <img src="${event.posterImage || '/icons/lebedi.jpg'}" alt="${event.title}" />
    </div>
    <div class="event-details-content">
      <p class="event-date">${formatEventDateRange(event.startAt, event.endAt)}</p>
      <h1>${event.title}</h1>
      <p class="menu-page-description">${event.shortDescription || ''}</p>
      <div class="event-full-description">${(event.fullDescription || '').replace(/\n/g, '<br/>')}</div>
      <div class="event-card-actions">${buildCtas(event)}<a class="btn btn-secondary" href="/booking?event=${encodeURIComponent(event.slug)}">Відкрити мапу та бронювання</a></div>
    </div>
  `;
}

renderEventsListPage().catch(() => null);
renderSingleEventPage().catch(() => null);
