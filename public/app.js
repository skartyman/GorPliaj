const reservationForm = document.getElementById('reservationForm');
const reservationFormState = document.getElementById('reservationFormState');
const installBtn = document.getElementById('installBtn');
const languageToggle = document.getElementById('languageToggle');
const heroMenuCount = document.getElementById('heroMenuCount');
const menuCountChip = document.getElementById('menuCountChip');
const homePageHeader = document.querySelector('.home-page-header');

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
    heroPanelLabel: 'Відпочинок біля моря',
    heroPanelTitle: 'Простір для спокійного дня та вечора з видом на море',
    heroPanelText: 'Світлі зали, пляжна зона та тераса формують послідовний маршрут гостя: від знайомства з локацією до бронювання столу.',
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
    navAtmosphere: 'Атмосфера',
    navContacts: 'Контакти',
    navAgreement: 'Угода',
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
    galleryLabel: 'Що є на локації',
    galleryFeature1: 'Тераса біля моря',
    galleryFeature2: 'Лаунж та ресторанна зала',
    galleryFeature3: 'Швидке онлайн-бронювання',
    visualLabel: 'Стиль комплексу',
    visualText: 'Оновлена головна сторінка робить акцент на логічній подачі інформації: спочатку атмосфера, далі меню та бронювання, а потім контакти й умови користування.',
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
    bookingAgreementNote: 'Натискаючи кнопку, ви погоджуєтесь з умовами бронювання та правилами використання сайту.',
    createReservation: 'Створити бронювання',
    bookingMapCta: 'Відкрити карту столів',
    bookingAsideLabel: 'Як це працює',
    bookingFeature1: 'Заповніть коротку форму бронювання.',
    bookingFeature2: 'Оберіть бажану зону відпочинку.',
    bookingFeature3: 'Для точного вибору скористайтесь картою столів.',
    eventsKicker: 'Live atmosphere',
    eventsTitle: 'Атмосфера, події та пропозиції',
    eventsLead: 'На головній сторінці залишили лише корисні блоки: атмосфера, меню, бронювання, контакти та юридичні умови.',
    event1Title: 'П’ятничні заходи сонця з діджеєм',
    event1Text: 'Щоп’ятниці з 19:00 — музичний вечір на пляжі та фірмові коктейлі.',
    event2Title: 'Сімейні вихідні',
    event2Text: 'Субота та неділя — анімація для дітей і зона сімейного відпочинку.',
    promoTitle: 'Щоденні пропозиції',
    promoLead: 'Знижки на сніданки, пляжні комбо та приємні бонуси для гостей, що бронюють заздалегідь.',
    newsKicker: 'Special offers',
    newsTitle: 'Що варто спробувати',
    promo1: 'З 10:00 до 12:00 — знижка 20% на сніданки.',
    promo2: 'Комбо «Пляжний день»: шезлонг + лимонад + салат за спеціальною ціною.',
    promo3: 'Іменинникам — десерт у подарунок під час бронювання столу.',
    contactsKicker: 'Contact us',
    contactsTitle: 'Контакти',
    contactsText: 'Пишіть або телефонуйте, якщо потрібне бронювання для події, приватної вечері чи великої компанії.',
    addressLabel: 'Адреса',
    phoneLabel: 'Телефон',
    address: 'Одеса, пляж Отрада',
    agreementKicker: 'User agreement',
    agreementTitle: 'Ліцензійна угода та умови використання',
    agreementIntro: 'Використовуючи сайт ГорПляж, ви погоджуєтесь із правилами використання контенту, бронювання та обробки контактних даних.',
    agreementItem1Title: '1. Контент і бренд',
    agreementItem1Text: 'Усі логотипи, фото, тексти та елементи інтерфейсу належать ГорПляж і не можуть копіюватися чи поширюватися без письмового дозволу.',
    agreementItem2Title: '2. Онлайн-бронювання',
    agreementItem2Text: 'Користувач зобов’язується залишати актуальні контактні дані, а заклад залишає за собою право уточнювати або підтверджувати бронювання телефоном.',
    agreementItem3Title: '3. Дані та зв’язок',
    agreementItem3Text: 'Контактні дані використовуються лише для обробки бронювання, сервісних повідомлень та зворотного зв’язку щодо візиту.',
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
    heroPanelLabel: 'Seaside leisure',
    heroPanelTitle: 'A calm daytime and evening venue with sea views',
    heroPanelText: 'Bright halls, the beach zone, and the terrace create a smooth guest journey from discovery to booking.',
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
    navAtmosphere: 'Atmosphere',
    navContacts: 'Contacts',
    navAgreement: 'Agreement',
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
    galleryLabel: 'What is on-site',
    galleryFeature1: 'Seaside terrace',
    galleryFeature2: 'Lounge and restaurant hall',
    galleryFeature3: 'Fast online booking',
    visualLabel: 'Venue style',
    visualText: 'The refreshed homepage follows a clearer order: atmosphere first, then menu and booking, followed by contacts and usage terms.',
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
    bookingAgreementNote: 'By clicking the button, you agree to the booking terms and website usage rules.',
    createReservation: 'Create booking',
    bookingMapCta: 'Open table map',
    bookingAsideLabel: 'How it works',
    bookingFeature1: 'Fill in the short booking form.',
    bookingFeature2: 'Choose your preferred area.',
    bookingFeature3: 'Use the table map for precise table selection.',
    eventsKicker: 'Live atmosphere',
    eventsTitle: 'Atmosphere, events, and offers',
    eventsLead: 'Only useful sections remain on the homepage: atmosphere, menu, booking, contacts, and legal terms.',
    event1Title: 'Friday sunsets with DJ',
    event1Text: 'Every Friday from 19:00 — beach music evenings and signature cocktails.',
    event2Title: 'Family weekends',
    event2Text: 'Saturday and Sunday — kids activities and family recreation area.',
    promoTitle: 'Daily offers',
    promoLead: 'Breakfast discounts, beach combos, and pleasant bonuses for guests who book in advance.',
    newsKicker: 'Special offers',
    newsTitle: 'What to try',
    promo1: 'From 10:00 to 12:00 — 20% discount on breakfasts.',
    promo2: '"Beach Day" combo: sunbed + lemonade + salad at a special price.',
    promo3: 'Birthday guests get a complimentary dessert with table booking.',
    contactsKicker: 'Contact us',
    contactsTitle: 'Contacts',
    contactsText: 'Message or call us if you need a booking for an event, a private dinner, or a large group.',
    addressLabel: 'Address',
    phoneLabel: 'Phone',
    address: 'Odesa, Otrada Beach',
    agreementKicker: 'User agreement',
    agreementTitle: 'License agreement and terms of use',
    agreementIntro: 'By using the GorPliaj website, you agree to the rules for content usage, reservations, and contact data processing.',
    agreementItem1Title: '1. Content and brand',
    agreementItem1Text: 'All logos, photos, texts, and interface elements belong to GorPliaj and may not be copied or distributed without written permission.',
    agreementItem2Title: '2. Online booking',
    agreementItem2Text: 'Users must provide valid contact details, and the venue may clarify or confirm reservations by phone.',
    agreementItem3Title: '3. Data and communication',
    agreementItem3Text: 'Contact data is used only for reservation processing, service messages, and follow-up communication related to the visit.',
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
  updateAnchorScrollOffset();
}

function updateAnchorScrollOffset() {
  if (!homePageHeader) return;

  const headerStyles = window.getComputedStyle(homePageHeader);
  const stickyTop = Number.parseFloat(headerStyles.top) || 0;
  const anchorOffset = Math.ceil(homePageHeader.offsetHeight + stickyTop + 12);

  document.documentElement.style.setProperty('--anchor-scroll-offset', `${anchorOffset}px`);
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

window.addEventListener('load', updateAnchorScrollOffset);
window.addEventListener('resize', updateAnchorScrollOffset);

if (homePageHeader && 'ResizeObserver' in window) {
  const headerResizeObserver = new ResizeObserver(() => {
    updateAnchorScrollOffset();
  });

  headerResizeObserver.observe(homePageHeader);
}

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
