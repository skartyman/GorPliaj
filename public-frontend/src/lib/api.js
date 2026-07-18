const API_BASE = '/api';

function getWaiterToken() {
  try {
    return localStorage.getItem('waiter_token');
  } catch {
    return null;
  }
}

function getGuestToken() {
  try {
    return localStorage.getItem('guest_token');
  } catch {
    return null;
  }
}

async function request(path, init) {
  const waiterToken = getWaiterToken();
  const guestToken = getGuestToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(waiterToken ? { Authorization: `Bearer ${waiterToken}` } : {}),
      ...(guestToken ? { Authorization: `Bearer ${guestToken}` } : {}),
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
  menu: () => request('/menu'),
  weather: () => request('/weather')
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
  bookableUnits: (mapId, params) => { console.log('DEBUG_AGY_API', mapId, params);
    const search = new URLSearchParams({
      date: params.date,
      timeFrom: params.timeFrom
    });
    if (params.guests) search.set('guests', String(params.guests));
    if (params.bookingKind) search.set('bookingKind', params.bookingKind);
    if (params.zoneId) search.set('zoneId', String(params.zoneId));
    if (params.eventId) search.set('eventId', String(params.eventId));
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

export const holdsApi = {
  create: ({ tableId, tableIds, date, timeFrom, timeTo, locale }) =>
    request('/holds', {
      method: 'POST',
      body: JSON.stringify({ tableId, tableIds, date, timeFrom, timeTo, locale })
    }),
  release: (holdToken) =>
    request(`/holds/${encodeURIComponent(holdToken)}`, {
      method: 'DELETE'
    })
};

export const settingsApi = {
  getPublic: () => request('/settings'),
  updatePublic: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const tableOrderApi = {
  create: (payload) => request('/table-orders', { method: 'POST', body: JSON.stringify(payload) }),
  status: (id) => request(`/table-orders/${id}/status`),
  sseUrl: (id) => `${API_BASE}/table-orders/${id}/sse`,
  getTableWaiter: (code) => request(`/table-waiter?code=${encodeURIComponent(code)}`)
};

export const waiterCallApi = {
  create: (payload) => request('/waiter-calls', { method: 'POST', body: JSON.stringify(payload) })
};

export const waiterApi = {
  login: (pinCode) => request('/waiter/auth/login', { method: 'POST', body: JSON.stringify({ pinCode }) }),
  me: () => request('/waiter/auth/me'),
  logout: () => request('/waiter/auth/logout', { method: 'POST' }),
  startShift: () => request('/waiter/shift/start', { method: 'POST' }),
  endShift: () => request('/waiter/shift/end', { method: 'POST' }),
  getShift: () => request('/waiter/shift'),
  scanTable: (tableId) => request('/waiter/tables/scan', { method: 'POST', body: JSON.stringify({ tableId }) }),
  scanTableByCode: (code) => request('/waiter/tables/scan-by-code', { method: 'POST', body: JSON.stringify({ code }) }),
  removeTable: (tableId) => request(`/waiter/tables/${tableId}`, { method: 'DELETE' }),
  getTables: () => request('/waiter/tables'),
  getTelegramLink: () => request('/waiter/telegram/link'),
  getOrders: () => request('/waiter/orders'),
  acceptOrder: (id) => request(`/waiter/orders/${id}/accept`, { method: 'PATCH' }),
  completeOrder: (id) => request(`/waiter/orders/${id}/complete`, { method: 'PATCH' }),
  cancelOrder: (id) => request(`/waiter/orders/${id}/cancel`, { method: 'PATCH' }),
  getCalls: () => request('/waiter/calls'),
  respondToCall: (id) => request(`/waiter/calls/${id}/respond`, { method: 'PATCH' }),
  sseUrl: () => {
    const waiterToken = getWaiterToken();
    return waiterToken ? `/api/waiter/sse?token=${encodeURIComponent(waiterToken)}` : '/api/waiter/sse';
  }
};

export const guestApi = {
  requestLink: (email, phone, name) =>
    request('/guest/auth/request-link', { method: 'POST', body: JSON.stringify({ email, phone, name }) }),
  verifyLink: (token) =>
    request('/guest/auth/verify-link', { method: 'POST', body: JSON.stringify({ token }) }),
  me: () => request('/guest/me'),
  reservations: () => request('/guest/reservations'),
  favorites: () => request('/guest/favorites'),
  addFavorite: (tableId) => request('/guest/favorites', { method: 'POST', body: JSON.stringify({ tableId }) }),
  removeFavorite: (tableId) => request(`/guest/favorites/${tableId}`, { method: 'DELETE' }),
  cancelReservation: (id) => request(`/guest/reservations/${id}/cancel`, { method: 'POST' })
};
