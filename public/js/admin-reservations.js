const TOKEN_KEY = 'admin_auth_token';

function getTokenOrRedirect() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = '/admin/login.html';
    return null;
  }

  return token;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderRows(reservations) {
  const tbody = document.getElementById('reservations-tbody');

  if (!reservations.length) {
    tbody.innerHTML = '<tr><td colspan="9">No reservations found.</td></tr>';
    return;
  }

  tbody.innerHTML = reservations.map((reservation) => {
    const tableName = reservation.table?.code || reservation.table?.name || '-';
    const zoneName = reservation.zone?.name || '-';

    return `
      <tr>
        <td><a class="small-link" href="/admin/reservation.html?id=${reservation.id}">${reservation.id}</a></td>
        <td>${formatDate(reservation.reservationDate)}</td>
        <td>${formatTime(reservation.timeFrom)}</td>
        <td>${reservation.customerName}</td>
        <td>${reservation.customerPhone}</td>
        <td>${tableName}</td>
        <td>${zoneName}</td>
        <td>${reservation.guests}</td>
        <td><span class="status-pill ${reservation.status}">${reservation.status}</span></td>
      </tr>
    `;
  }).join('');
}

async function loadReservations() {
  const token = getTokenOrRedirect();
  if (!token) {
    return;
  }

  const response = await fetch('/api/admin/reservations', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/admin/login.html';
    return;
  }

  const body = await response.json().catch(() => []);

  if (!response.ok) {
    document.getElementById('error-message').textContent = body.message || 'Failed to load reservations.';
    return;
  }

  renderRows(body);
}

async function logout() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(() => null);
  }

  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/admin/login.html';
}

document.getElementById('logout-btn').addEventListener('click', logout);
loadReservations();
