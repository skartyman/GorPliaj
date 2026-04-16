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
  bySlug: (slug) => request(`/events/${encodeURIComponent(slug)}`)
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
  defaultMap: () => request('/maps/default'),
  availability: (mapId, reservationDate, timeFrom) =>
    request(`/maps/${mapId}/availability?date=${encodeURIComponent(reservationDate)}&timeFrom=${encodeURIComponent(timeFrom)}`)
};

export const bookingsApi = {
  create: (payload) =>
    request('/reservations', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};

export const settingsApi = {
  getPublic: () => request('/settings'),
  updatePublic: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};
