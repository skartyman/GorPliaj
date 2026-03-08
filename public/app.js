const menuList = document.getElementById('menuList');
const reservationList = document.getElementById('reservationList');
const reservationForm = document.getElementById('reservationForm');
const installBtn = document.getElementById('installBtn');
const langButtons = document.querySelectorAll('.lang-btn');

let deferredPrompt;
let currentLanguage = localStorage.getItem('language') || 'uk';
let reservationsCache = [];
let menuCache = [];

const translations = {
  uk: {
    pageTitle: 'ГорПляж — Одеса, пляж Отрада',
    heroTitle: 'ГорПляж в Одесі',
    heroSubtitle: 'Пляж Отрада, море та відпочинок зі смаком — усе в одному місці.',
    langUk: 'Українська',
    langEn: 'Англійська',
    siteMenu: 'Меню сайту ▾',
    navAbout: 'Про заклад',
    navMenu: 'Меню',
    navBooking: 'Бронювання',
    navContacts: 'Контакти',
    installApp: 'Встановити як застосунок',
    aboutTitle: 'Про заклад',
    aboutText: 'ГорПляж — це пляжний простір в Одесі на пляжі Отрада, де можна поснідати біля моря, провести вечір на терасі й організувати відпочинок для компанії.',
    menuTitle: 'Меню комплексу',
    bookingTitle: 'Онлайн-бронювання',
    guestName: 'Ім’я гостя',
    phone: 'Телефон',
    date: 'Дата',
    time: 'Час',
    guests: 'Гостей',
    zone: 'Зона',
    zoneSelect: 'Оберіть',
    zoneBeach: 'Пляжна лінія',
    zoneTerrace: 'Тераса',
    zoneLounge: 'Лаунж',
    zoneHall: 'Ресторанна зала',
    note: 'Побажання',
    createReservation: 'Створити бронювання',
    eventsTitle: 'Афіша та анонси',
    event1Title: 'П’ятничні заходи сонця з діджеєм',
    event1Text: 'Щоп’ятниці з 19:00 — музичний вечір на пляжі та фірмові коктейлі.',
    event2Title: 'Сімейні вихідні',
    event2Text: 'Субота та неділя — анімація для дітей і зона сімейного відпочинку.',
    event3Title: 'Кіно просто неба',
    event3Text: 'Щочетверга після заходу сонця — покази фільмів біля моря.',
    newsTitle: 'Новини та акції',
    promo1: 'З 10:00 до 12:00 — знижка 20% на сніданки.',
    promo2: 'Комбо «Пляжний день»: шезлонг + лимонад + салат за спеціальною ціною.',
    promo3: 'Іменинникам — десерт у подарунок під час бронювання столу.',
    reservationsTitle: 'Список бронювань',
    reservationsHint: 'Змінюйте статус бронювання: нове → підтверджене → скасоване.',
    contactsTitle: 'Контакти',
    address: 'Одеса, пляж Отрада',
    noReservations: 'Поки немає бронювань. Створіть перше!',
    reservationStatus: 'Статус',
    statusNew: 'нове',
    statusConfirmed: 'підтверджене',
    statusCancelled: 'скасоване',
    changeStatus: 'Змінити статус',
    delete: 'Видалити',
    reservationError: 'Не вдалося створити бронювання. Перевірте поля форми.',
    loadingError: 'Помилка завантаження даних. Перевірте сервер.',
    guestsWord: 'гостей'
  },
  en: {
    pageTitle: 'GorPliaj — Odesa, Otrada Beach',
    heroTitle: 'GorPliaj in Odesa',
    heroSubtitle: 'Otrada Beach, sea views, and quality relaxation all in one place.',
    langUk: 'Ukrainian',
    langEn: 'English',
    siteMenu: 'Site menu ▾',
    navAbout: 'About',
    navMenu: 'Menu',
    navBooking: 'Booking',
    navContacts: 'Contacts',
    installApp: 'Install as app',
    aboutTitle: 'About',
    aboutText: 'GorPliaj is a beach venue in Odesa on Otrada Beach where you can have breakfast by the sea, spend an evening on the terrace, and organize leisure time for your group.',
    menuTitle: 'Venue menu',
    bookingTitle: 'Online booking',
    guestName: 'Guest name',
    phone: 'Phone',
    date: 'Date',
    time: 'Time',
    guests: 'Guests',
    zone: 'Area',
    zoneSelect: 'Choose',
    zoneBeach: 'Beachfront',
    zoneTerrace: 'Terrace',
    zoneLounge: 'Lounge',
    zoneHall: 'Restaurant hall',
    note: 'Notes',
    createReservation: 'Create booking',
    eventsTitle: 'Events and announcements',
    event1Title: 'Friday sunsets with DJ',
    event1Text: 'Every Friday from 19:00 — beach music evenings and signature cocktails.',
    event2Title: 'Family weekends',
    event2Text: 'Saturday and Sunday — kids activities and family recreation area.',
    event3Title: 'Open-air cinema',
    event3Text: 'Every Thursday after sunset — movie screenings by the sea.',
    newsTitle: 'News and offers',
    promo1: 'From 10:00 to 12:00 — 20% discount on breakfasts.',
    promo2: '"Beach Day" combo: sunbed + lemonade + salad at a special price.',
    promo3: 'Birthday guests get a complimentary dessert with table booking.',
    reservationsTitle: 'Booking list',
    reservationsHint: 'Cycle booking status: new → confirmed → cancelled.',
    contactsTitle: 'Contacts',
    address: 'Odesa, Otrada Beach',
    noReservations: 'No bookings yet. Create the first one!',
    reservationStatus: 'Status',
    statusNew: 'new',
    statusConfirmed: 'confirmed',
    statusCancelled: 'cancelled',
    changeStatus: 'Change status',
    delete: 'Delete',
    reservationError: 'Could not create booking. Please check form fields.',
    loadingError: 'Data loading error. Please check the server.',
    guestsWord: 'guests'
  }
};

function statusLabels() {
  const dictionary = translations[currentLanguage];
  return {
    new: dictionary.statusNew,
    confirmed: dictionary.statusConfirmed,
    cancelled: dictionary.statusCancelled
  };
}

function translatePage() {
  const dictionary = translations[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.title = dictionary.pageTitle;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  langButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === currentLanguage);
  });

  renderMenu(menuCache);
  renderReservations(reservationsCache);
}

function renderMenu(menu) {
  menuList.innerHTML = menu
    .map(
      (item) => `
      <li class="menu-item">
        <div>
          <strong>${item.name[currentLanguage] || item.name.uk}</strong><br/>
          <small>${item.category[currentLanguage] || item.category.uk}</small>
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

function renderReservations(reservations) {
  const dictionary = translations[currentLanguage];
  const statuses = statusLabels();

  if (!reservations.length) {
    reservationList.innerHTML = `<p>${dictionary.noReservations}</p>`;
    return;
  }

  reservationList.innerHTML = reservations
    .map(
      (item) => `
      <article class="reservation-item">
        <strong>#${item.id} — ${item.guestName}</strong>
        <span>${item.date} ${item.time} • ${item.guests} ${dictionary.guestsWord} • ${item.zone}</span>
        <span class="status-${item.status}">${dictionary.reservationStatus}: ${statuses[item.status] || item.status}</span>
        <small>${item.phone}${item.note ? ` • ${item.note}` : ''}</small>
        <div class="reservation-actions">
          <button data-action="toggle" data-id="${item.id}" data-status="${item.status}">${dictionary.changeStatus}</button>
          <button data-action="delete" data-id="${item.id}">${dictionary.delete}</button>
        </div>
      </article>`
    )
    .join('');
}

async function fetchMenu() {
  const response = await fetch('/api/menu');
  menuCache = await response.json();
  renderMenu(menuCache);
}

async function fetchReservations() {
  const response = await fetch('/api/reservations');
  reservationsCache = await response.json();
  renderReservations(reservationsCache);
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
    alert(translations[currentLanguage].reservationError);
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

langButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentLanguage = button.dataset.lang;
    localStorage.setItem('language', currentLanguage);
    translatePage();
  });
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

Promise.all([fetchMenu(), fetchReservations()])
  .then(() => {
    translatePage();
  })
  .catch(() => {
    reservationList.innerHTML = `<p>${translations[currentLanguage].loadingError}</p>`;
  });
