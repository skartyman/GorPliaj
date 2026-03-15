async function ensureAuthenticated() {
  const response = await fetch('/api/admin/auth/me', {
    credentials: 'same-origin'
  });

  if (response.ok) {
    return true;
  }

  window.location.href = '/admin/login';
  return false;
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function detailItem(label, value) {
  return `<div class="detail-item"><strong>${label}</strong><div>${value || '-'}</div></div>`;
}

function renderDetails(reservation) {
  const detail = document.getElementById('detail-content');
  detail.innerHTML = [
    detailItem('Reservation ID', reservation.id),
    detailItem('Customer name', reservation.customerName),
    detailItem('Customer phone', reservation.customerPhone),
    detailItem('Customer email', reservation.customerEmail || '-'),
    detailItem('Guests', reservation.guests),
    detailItem('Reservation date', formatDateTime(reservation.reservationDate)),
    detailItem('Time from', formatDateTime(reservation.timeFrom)),
    detailItem('Time to', formatDateTime(reservation.timeTo)),
    detailItem('Table', reservation.table?.code || reservation.table?.name || '-'),
    detailItem('Zone', reservation.zone?.name || '-'),
    detailItem('Map', reservation.map?.name || '-'),
    detailItem('Customer comments', reservation.commentCustomer || '-'),
    detailItem('Admin comments', reservation.commentAdmin || '-')
  ].join('');

  document.getElementById('current-status').innerHTML = `<span class="status-pill ${reservation.status}">${reservation.status}</span>`;
}

function renderStatusActions(allowedStatuses, onChangeStatus) {
  const actions = document.getElementById('status-actions');

  if (!allowedStatuses.length) {
    actions.innerHTML = '<p class="info">No status changes available.</p>';
    return;
  }

  actions.innerHTML = '';

  allowedStatuses.forEach((status) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Set ${status}`;
    if (status === 'CANCELLED') {
      button.classList.add('danger');
    }

    button.addEventListener('click', () => onChangeStatus(status));
    actions.appendChild(button);
  });
}

async function logout() {
  await fetch('/api/admin/auth/logout', {
    method: 'POST',
    credentials: 'same-origin'
  }).catch(() => null);

  window.location.href = '/admin/login';
}

async function init() {
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    return;
  }

  const reservationId = Number(new URLSearchParams(window.location.search).get('id'));
  if (!reservationId) {
    document.getElementById('error-message').textContent = 'Reservation id is missing.';
    return;
  }

  const loadReservation = async () => {
    const response = await fetch(`/api/admin/reservations/${reservationId}`, {
      credentials: 'same-origin'
    });

    if (response.status === 401) {
      window.location.href = '/admin/login';
      return null;
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      document.getElementById('error-message').textContent = body.message || 'Failed to load reservation.';
      return null;
    }

    return body;
  };

  const attachStatusHandler = async (status) => {
    const response = await fetch(`/api/admin/reservations/${reservationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ status })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      document.getElementById('error-message').textContent = body.message || 'Failed to update status.';
      return;
    }

    document.getElementById('error-message').textContent = '';
    const refreshed = await loadReservation();
    if (refreshed) {
      renderDetails(refreshed.reservation);
      renderStatusActions(refreshed.allowedNextStatuses, attachStatusHandler);
    }
  };

  const initial = await loadReservation();
  if (!initial) {
    return;
  }

  renderDetails(initial.reservation);
  renderStatusActions(initial.allowedNextStatuses, attachStatusHandler);
}

document.getElementById('logout-btn').addEventListener('click', logout);
init();
