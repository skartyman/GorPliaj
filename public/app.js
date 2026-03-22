const reservationForm = document.getElementById('reservationForm');
const reservationFormState = document.getElementById('reservationFormState');
const installBtn = document.getElementById('installBtn');
const languageToggle = document.getElementById('languageToggle');
const heroMenuCount = document.getElementById('heroMenuCount');
const menuCountChip = document.getElementById('menuCountChip');

let deferredPrompt;
let currentLanguage = localStorage.getItem('language') || 'uk';
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
    heroMenuCta: 'Переглянути меню',
    heroSecondaryCta: 'Відкрити карту столів',
    highlightMenu: 'Позицій меню',
    highlightBookingAccess: 'Онлайн бронювання',
    highlightBookingAccessValue: '24/7',
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
    languageToggleLabel: 'EN',
    languageToggleAria: 'Switch language to English',
    navAbout: 'Про заклад',
    navMenu: 'Меню',
    navBooking: 'Бронювання',
    navEvents: 'Події',
    navNews: 'Акції',
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
    menuPreviewText: 'Окрема сторінка меню з категоріями, картками страв і швидкою навігацією.',
    menuPreviewCta: 'Відкрити меню',
    menuPreviewSecondary: 'Спочатку забронювати столик',
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
    contactsKicker: 'Contact us',
    contactsTitle: 'Контакти',
    addressLabel: 'Адреса',
    phoneLabel: 'Телефон',
    address: 'Одеса, пляж Отрада',
    noMenu: 'Меню тимчасово недоступне.',
    reservationError: 'Не вдалося створити бронювання. Перевірте поля форми.',
    reservationSuccess: 'Бронювання створено. Ми вже готуємо найкраще місце для вас.',
    loadingError: 'Помилка завантаження даних. Перевірте сервер.',
    menuItemsCount: 'позицій'
  },
  en: {
    pageTitle: 'GorPliaj — Odesa, Otrada Beach',
    brandSubtitle: 'Beach · Restaurant · Events',
    heroEyebrow: 'Beach venue in Odesa',
    heroTitle: 'GorPliaj in Odesa',
    heroSubtitle: 'Otrada Beach, sea views, and quality relaxation all in one place.',
    heroDescription: 'Menu, online booking, table map, and event updates are combined into one modern guest interface.',
    heroPrimaryCta: 'Book online',
    heroMenuCta: 'View menu',
    heroSecondaryCta: 'Open table map',
    highlightMenu: 'Menu items',
    highlightBookingAccess: 'Online booking',
    highlightBookingAccessValue: '24/7',
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
    languageToggleLabel: 'UK',
    languageToggleAria: 'Перемкнути мову на українську',
    navAbout: 'About',
    navMenu: 'Menu',
    navBooking: 'Booking',
    navEvents: 'Events',
    navNews: 'Offers',
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
    menuPreviewText: 'A dedicated menu page with categories, dish cards, and quick navigation.',
    menuPreviewCta: 'Open menu',
    menuPreviewSecondary: 'Book a table first',
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
    contactsKicker: 'Contact us',
    contactsTitle: 'Contacts',
    addressLabel: 'Address',
    phoneLabel: 'Phone',
    address: 'Odesa, Otrada Beach',
    noMenu: 'Menu is temporarily unavailable.',
    reservationError: 'Could not create booking. Please check form fields.',
    reservationSuccess: 'Booking created. We are already preparing the best spot for you.',
    loadingError: 'Data loading error. Please check the server.',
    menuItemsCount: 'items'
  }
};

function updateCounters() {
  const dictionary = translations[currentLanguage];
  const menuCount = menuCache.reduce((total, category) => total + (Array.isArray(category.items) ? category.items.length : 0), 0);

  heroMenuCount.textContent = menuCount;
  menuCountChip.textContent = `${menuCount} ${dictionary.menuItemsCount}`;
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

  if (languageToggle) {
    languageToggle.textContent = dictionary.languageToggleLabel;
    languageToggle.setAttribute('aria-label', dictionary.languageToggleAria);
  }

  updateCounters();
}

async function fetchMenu() {
  const response = await fetch('/api/menu');
  menuCache = await response.json();
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
});

languageToggle?.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'uk' ? 'en' : 'uk';
  localStorage.setItem('language', currentLanguage);
  translatePage();
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

translatePage();

fetchMenu().catch(() => {
  menuCountChip.textContent = translations[currentLanguage].loadingError;
});
