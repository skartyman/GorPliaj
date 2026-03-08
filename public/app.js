const menuList = document.getElementById('menuList');
const reservationList = document.getElementById('reservationList');
const reservationForm = document.getElementById('reservationForm');
const installBtn = document.getElementById('installBtn');

let deferredPrompt;
const statusLabels = {
  new: 'нове',
  confirmed: 'підтверджене',
  cancelled: 'скасоване'
};

async function fetchMenu() {
  const response = await fetch('/api/menu');
  const menu = await response.json();

  menuList.innerHTML = menu
    .map(
      (item) => `
      <li class="menu-item">
        <div>
          <strong>${item.name}</strong><br/>
          <small>${item.category}</small>
        </div>
        <span>${item.price} ₴</span>
      </li>`
    )
    .join('');
}

function nextStatus(status) {
  const order = ['new', 'confirmed', 'cancelled'];
  const index = order.indexOf(status);
  return order[(index + 1) % order.length];
}

async function fetchReservations() {
  const response = await fetch('/api/reservations');
  const reservations = await response.json();

  if (!reservations.length) {
    reservationList.innerHTML = '<p>Поки немає бронювань. Створіть перше!</p>';
    return;
  }

  reservationList.innerHTML = reservations
    .map(
      (item) => `
      <article class="reservation-item">
        <strong>#${item.id} — ${item.guestName}</strong>
        <span>${item.date} ${item.time} • ${item.guests} гостей • ${item.zone}</span>
        <span class="status-${item.status}">Статус: ${statusLabels[item.status] || item.status}</span>
        <small>${item.phone}${item.note ? ` • ${item.note}` : ''}</small>
        <div class="reservation-actions">
          <button data-action="toggle" data-id="${item.id}" data-status="${item.status}">Змінити статус</button>
          <button data-action="delete" data-id="${item.id}">Видалити</button>
        </div>
      </article>`
    )
    .join('');
}

reservationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(reservationForm);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    alert('Не вдалося створити бронювання. Перевірте поля форми.');
    return;
  }

  reservationForm.reset();
  await fetchReservations();
});

reservationList.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === 'toggle') {
    const status = nextStatus(button.dataset.status);
    await fetch(`/api/reservations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  }

  if (action === 'delete') {
    await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
  }

  await fetchReservations();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

Promise.all([fetchMenu(), fetchReservations()]).catch(() => {
  reservationList.innerHTML = '<p>Помилка завантаження даних. Перевірте сервер.</p>';
});
