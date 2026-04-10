import { useState, useEffect, createContext, useContext } from 'react';

export const translations = {
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
    guestName: 'Імʼя гостя',
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
    event1Title: 'Пʼятничні заходи сонця з діджеєм',
    event1Text: 'Щопʼятниці з 19:00 — музичний вечір на пляжі та фірмові коктейлі.',
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
    menuItemsCount: 'позицій',
    menuPageKicker: 'Kitchen & bar',
    menuPageTitle: 'Меню ГорПляжу',
    menuPageDescription: 'Окрема сторінка з категоріями та зручним переглядом основних позицій, як у digital menu.',
    menuBackHome: '← На головну',
    menuFeatureLabel: 'Рекомендація',
    featuredPrefix: 'Сьогодні радимо спробувати одну з найпопулярніших позицій комплексу.',
    categoryCount: 'позицій'
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
    menuItemsCount: 'items',
    menuPageKicker: 'Kitchen & bar',
    menuPageTitle: 'GorPliaj Menu',
    menuPageDescription: 'A dedicated page with categories and an easy overview of signature dishes, similar to a digital menu.',
    menuBackHome: '← Back home',
    menuFeatureLabel: 'Recommended',
    featuredPrefix: 'Today we recommend trying one of the venueʼs most popular items.',
    categoryCount: 'items'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => 
    localStorage.getItem('language') || 'uk'
  );

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setCurrentLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const setLanguage = (lang) => {
    localStorage.setItem('language', lang);
    setCurrentLanguage(lang);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang } }));
  };

  const t = (key) => translations[currentLanguage][key] || key;

  return (
    <LanguageContext.Provider value={{ t, currentLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslations must be used within a LanguageProvider');
  }
  return context;
}
