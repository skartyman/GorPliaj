const API_BASE = '/api';

async function request(path, init) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {})
    },
    ...init
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export const contentApi = {
  news: () => request('/news'),
  menu: () => request('/menu')
};

export const eventsApi = {
  list: (includePast = true) => request(`/events?includePast=${includePast ? '1' : '0'}`),
  bySlug: (slug) => request(`/events/${encodeURIComponent(slug)}`),
  ticketTypes: (slug) => request(`/events/${encodeURIComponent(slug)}/ticket-types`),
  createTicketOrder: (slug, payload) =>
    request(`/events/${encodeURIComponent(slug)}/ticket-orders`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  ticketOrderStatus: (orderNumber, token) =>
    request(`/ticket-orders/${encodeURIComponent(orderNumber)}/status?token=${encodeURIComponent(token)}`)
};

export const menuApi = {
  list: () => request('/menu'),
  setLike: (itemId, liked) =>
    request(`/menu/items/${itemId}/like`, {
      method: 'POST',
      body: JSON.stringify({ liked })
    })
};

export const mapApi = {
  list: ({ usageMode, bookingKind, guests } = {}) => {
    const params = new URLSearchParams();
    if (usageMode) params.set('usageMode', usageMode);
    if (bookingKind) params.set('bookingKind', bookingKind);
    if (guests) params.set('guests', String(guests));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request(`/maps${suffix}`);
  },
  defaultMap: () => request('/maps/default'),
  byId: (mapId) => request(`/maps/${mapId}`),
  availability: (mapId, reservationDate, timeFrom) =>
    request(`/maps/${mapId}/availability?date=${encodeURIComponent(reservationDate)}&timeFrom=${encodeURIComponent(timeFrom)}`),
  bookableUnits: (mapId, params) => {
    const search = new URLSearchParams({
      date: params.date,
      timeFrom: params.timeFrom
    });
    if (params.guests) search.set('guests', String(params.guests));
    if (params.bookingKind) search.set('bookingKind', params.bookingKind);
    if (params.zoneId) search.set('zoneId', String(params.zoneId));
    return request(`/maps/${mapId}/bookable-units?${search.toString()}`);
  }
};

export const bookingsApi = {
  create: (payload) =>
    request('/reservations', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  status: (ticketCode, token) =>
    request(`/reservations/${encodeURIComponent(ticketCode)}/status?t=${encodeURIComponent(token)}`)
};

export const settingsApi = {
  getPublic: () => request('/settings'),
  updatePublic: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};
