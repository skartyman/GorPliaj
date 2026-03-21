const menuList = document.getElementById('menuList');
const reservationList = document.getElementById('reservationList');
const reservationForm = document.getElementById('reservationForm');
const reservationFormState = document.getElementById('reservationFormState');
const installBtn = document.getElementById('installBtn');
const langButtons = document.querySelectorAll('.lang-btn');
const heroMenuCount = document.getElementById('heroMenuCount');
const heroReservationCount = document.getElementById('heroReservationCount');
const menuCountChip = document.getElementById('menuCountChip');
const reservationCountChip = document.getElementById('reservationCountChip');

let deferredPrompt;
let currentLanguage = localStorage.getItem('language') || 'uk';
let reservationsCache = [];
let menuCache = [];

const translations = {
  uk: {
    pageTitle: 'ГорПляж — Одеса, пляж Отрада',
    brandSubtitle: 'Beach · Restaurant · Events',
    heroEyebrow: 'Пляжний комплекс в Одесі',
    heroTitle: 'ГорПляж в Одесі',
    heroSubtitle: 'Пляж Отрада, море та відпочинок зі смаком — усе в одному місці.',
    heroDescription: 'Меню, онлайн-бронювання, карта столів та анонси подій зібрані в одному сучасному інтерфейсі для гостей.',
    heroPrimaryCta: 'Забронювати онлайн',
    heroSecondaryCta: 'Відкрити карту столів',
    highlightMenu: 'Позицій меню',
    highlightReservations: 'Активних броней',
    highlightZones: 'Основних зон',
    heroPanelLabel: 'Готово до графіки',
    heroPanelTitle: 'Сучасний публічний фронт для гостей',
    heroPanelText: 'Простий шлях від першого враження до бронювання столу: меню, події, карта та контактна інформація працюють як єдина система.',
    service1Title: 'Онлайн бронювання',
    service1Text: 'Створення заявки за хвилину прямо з головної.',
    service2Title: 'Інтерактивна карта',
    service2Text: 'Швидкий перехід до вибору конкретного столу.',
    service3Title: 'Події та акції',
    service3Text: 'Анонси та спецпропозиції для залучення гостей.',
    langUk: 'Українська',
    langEn: 'Англійська',
    navAbout: 'Про заклад',
    navMenu: 'Меню',
    navBooking: 'Бронювання',
    navEvents: 'Події',
    navContacts: 'Контакти',
    installApp: 'Встановити як застосунок',
    aboutKicker: 'Про простір',
    aboutTitle: 'Про заклад',
    aboutText: 'ГорПляж — це пляжний простір в Одесі на пляжі Отрада, де можна поснідати біля моря, провести вечір на терасі й організувати відпочинок для компанії.',
    metricSea: 'Локація',
    metricSeaValue: 'Перша лінія біля моря',
    metricKitchen: 'Формат',
    metricKitchenValue: 'Ресторан + пляж + події',
    metricBooking: 'Сервіс',
    metricBookingValue: 'Онлайн бронювання і карта',
    menuKicker: 'Kitchen & bar',
    menuTitle: 'Меню комплексу',
    bookingKicker: 'Fast reservation',
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
    bookingMapCta: 'Відкрити карту столів',
    bookingAsideLabel: 'Як це працює',
    bookingAsideSecondaryLabel: 'Для візуальної вставки',
    bookingFeature1: 'Заповніть коротку форму бронювання.',
    bookingFeature2: 'Оберіть бажану зону відпочинку.',
    bookingFeature3: 'Для точного вибору скористайтесь картою столів.',
    bookingGraphicHint: 'Hero/background: 1600×900, promo cards: 3:2, icons: 128×128 PNG/SVG.',
    eventsKicker: 'Live atmosphere',
    eventsTitle: 'Афіша та анонси',
    event1Title: 'П’ятничні заходи сонця з діджеєм',
    event1Text: 'Щоп’ятниці з 19:00 — музичний вечір на пляжі та фірмові коктейлі.',
    event2Title: 'Сімейні вихідні',
    event2Text: 'Субота та неділя — анімація для дітей і зона сімейного відпочинку.',
    event3Title: 'Кіно просто неба',
    event3Text: 'Щочетверга після заходу сонця — покази фільмів біля моря.',
    newsKicker: 'Special offers',
    newsTitle: 'Новини та акції',
    promo1: 'З 10:00 до 12:00 — знижка 20% на сніданки.',
    promo2: 'Комбо «Пляжний день»: шезлонг + лимонад + салат за спеціальною ціною.',
    promo3: 'Іменинникам — десерт у подарунок під час бронювання столу.',
    reservationsKicker: 'Live feed',
    reservationsTitle: 'Список бронювань',
    reservationsHint: 'Змінюйте статус бронювання: нове → підтверджене → скасоване.',
    contactsKicker: 'Contact us',
    contactsTitle: 'Контакти',
    addressLabel: 'Адреса',
    phoneLabel: 'Телефон',
    address: 'Одеса, пляж Отрада',
    noReservations: 'Поки немає бронювань. Створіть перше!',
    noMenu: 'Меню тимчасово недоступне.',
    reservationStatus: 'Статус',
    statusNew: 'нове',
    statusConfirmed: 'підтверджене',
    statusCancelled: 'скасоване',
    changeStatus: 'Змінити статус',
    delete: 'Видалити',
    reservationError: 'Не вдалося створити бронювання. Перевірте поля форми.',
    reservationSuccess: 'Бронювання створено. Ми вже готуємо найкраще місце для вас.',
    loadingError: 'Помилка завантаження даних. Перевірте сервер.',
    guestsWord: 'гостей',
    menuItemsCount: 'позицій',
    reservationsCount: 'броней'
  },
  en: {
    pageTitle: 'GorPliaj — Odesa, Otrada Beach',
    brandSubtitle: 'Beach · Restaurant · Events',
    heroEyebrow: 'Beach venue in Odesa',
    heroTitle: 'GorPliaj in Odesa',
    heroSubtitle: 'Otrada Beach, sea views, and quality relaxation all in one place.',
    heroDescription: 'Menu, online booking, table map, and event updates are combined into one modern guest interface.',
    heroPrimaryCta: 'Book online',
    heroSecondaryCta: 'Open table map',
    highlightMenu: 'Menu items',
    highlightReservations: 'Active bookings',
    highlightZones: 'Main zones',
    heroPanelLabel: 'Graphics ready',
    heroPanelTitle: 'Modern guest-facing frontend',
    heroPanelText: 'A clean path from first impression to table booking: menu, events, map, and contact details work together as one flow.',
    service1Title: 'Online booking',
    service1Text: 'Create a booking request in a minute from the homepage.',
    service2Title: 'Interactive map',
    service2Text: 'Jump quickly to a specific table selection.',
    service3Title: 'Events and offers',
    service3Text: 'Announcements and promotions to attract guests.',
    langUk: 'Ukrainian',
    langEn: 'English',
    navAbout: 'About',
    navMenu: 'Menu',
    navBooking: 'Booking',
    navEvents: 'Events',
    navContacts: 'Contacts',
    installApp: 'Install as app',
    aboutKicker: 'About the venue',
    aboutTitle: 'About',
    aboutText: 'GorPliaj is a beach venue in Odesa on Otrada Beach where you can have breakfast by the sea, spend an evening on the terrace, and organize leisure time for your group.',
    metricSea: 'Location',
    metricSeaValue: 'First line by the sea',
    metricKitchen: 'Format',
    metricKitchenValue: 'Restaurant + beach + events',
    metricBooking: 'Service',
    metricBookingValue: 'Online booking and map',
    menuKicker: 'Kitchen & bar',
    menuTitle: 'Venue menu',
    bookingKicker: 'Fast reservation',
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
    bookingMapCta: 'Open table map',
    bookingAsideLabel: 'How it works',
    bookingAsideSecondaryLabel: 'For graphic inserts',
    bookingFeature1: 'Fill in the short booking form.',
    bookingFeature2: 'Choose your preferred area.',
    bookingFeature3: 'Use the table map for precise table selection.',
    bookingGraphicHint: 'Hero/background: 1600×900, promo cards: 3:2, icons: 128×128 PNG/SVG.',
    eventsKicker: 'Live atmosphere',
    eventsTitle: 'Events and announcements',
    event1Title: 'Friday sunsets with DJ',
    event1Text: 'Every Friday from 19:00 — beach music evenings and signature cocktails.',
    event2Title: 'Family weekends',
    event2Text: 'Saturday and Sunday — kids activities and family recreation area.',
    event3Title: 'Open-air cinema',
    event3Text: 'Every Thursday after sunset — movie screenings by the sea.',
    newsKicker: 'Special offers',
    newsTitle: 'News and offers',
    promo1: 'From 10:00 to 12:00 — 20% discount on breakfasts.',
    promo2: '"Beach Day" combo: sunbed + lemonade + salad at a special price.',
    promo3: 'Birthday guests get a complimentary dessert with table booking.',
    reservationsKicker: 'Live feed',
    reservationsTitle: 'Booking list',
    reservationsHint: 'Cycle booking status: new → confirmed → cancelled.',
    contactsKicker: 'Contact us',
    contactsTitle: 'Contacts',
    addressLabel: 'Address',
    phoneLabel: 'Phone',
    address: 'Odesa, Otrada Beach',
    noReservations: 'No bookings yet. Create the first one!',
    noMenu: 'Menu is temporarily unavailable.',
    reservationStatus: 'Status',
    statusNew: 'new',
    statusConfirmed: 'confirmed',
    statusCancelled: 'cancelled',
    changeStatus: 'Change status',
    delete: 'Delete',
    reservationError: 'Could not create booking. Please check form fields.',
    reservationSuccess: 'Booking created. We are already preparing the best spot for you.',
    loadingError: 'Data loading error. Please check the server.',
    guestsWord: 'guests',
    menuItemsCount: 'items',
    reservationsCount: 'bookings'
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

function updateCounters() {
  const dictionary = translations[currentLanguage];
  const reservationCount = reservationsCache.length;
  const menuCount = menuCache.length;

  heroMenuCount.textContent = menuCount;
  heroReservationCount.textContent = reservationCount;
  menuCountChip.textContent = `${menuCount} ${dictionary.menuItemsCount}`;
  reservationCountChip.textContent = `${reservationCount} ${dictionary.reservationsCount}`;
}

function setFormState(message = '', tone = '') {
  reservationFormState.textContent = message;
  reservationFormState.className = `form-state${message ? '' : ' hidden'}${tone ? ` is-${tone}` : ''}`;
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
  updateCounters();
}

function renderMenu(menu) {
  const dictionary = translations[currentLanguage];

  if (!menu.length) {
    menuList.innerHTML = `<li class="menu-item"><div><strong>${dictionary.noMenu}</strong></div></li>`;
    return;
  }

  menuList.innerHTML = menu
    .map(
      (item) => `
      <li class="menu-item">
        <div>
          <strong>${item.name[currentLanguage] || item.name.uk}</strong>
          <p class="menu-meta">${item.category[currentLanguage] || item.category.uk}</p>
        </div>
        <span class="menu-price">${item.price} ₴</span>
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
    reservationList.innerHTML = `<p class="reservation-meta">${dictionary.noReservations}</p>`;
    return;
  }

  reservationList.innerHTML = reservations
    .map(
      (item) => `
      <article class="reservation-item">
        <div>
          <strong>#${item.id} — ${item.guestName}</strong>
        </div>
        <p class="reservation-meta">${item.date} ${item.time} • ${item.guests} ${dictionary.guestsWord} • ${item.zone}</p>
        <span class="reservation-status status-${item.status}">${dictionary.reservationStatus}: ${statuses[item.status] || item.status}</span>
        <p class="reservation-meta">${item.phone}${item.note ? ` • ${item.note}` : ''}</p>
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
  updateCounters();
}

async function fetchReservations() {
  const response = await fetch('/api/reservations');
  reservationsCache = await response.json();
  renderReservations(reservationsCache);
  updateCounters();
}

reservationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(reservationForm);
  const payload = Object.fromEntries(formData.entries());
  setFormState('');

  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    setFormState(translations[currentLanguage].reservationError, 'error');
    return;
  }

  reservationForm.reset();
  setFormState(translations[currentLanguage].reservationSuccess, 'success');
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
    reservationList.innerHTML = `<p class="reservation-meta">${translations[currentLanguage].loadingError}</p>`;
  });
