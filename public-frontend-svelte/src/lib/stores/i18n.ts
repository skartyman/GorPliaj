import { derived, writable } from 'svelte/store';

export type Locale = 'uk' | 'en';

const STORAGE_KEY = 'gorpliaj-locale';

export const dictionary: Record<Locale, Record<string, string>> = {
  uk: {
    brandSubtitle: 'Beach · Restaurant · Events',
    navHome: 'Головна',
    navEvents: 'Події',
    navMenu: 'Меню',
    navBooking: 'Бронювання',
    navMap: 'Мапа',
    navAbout: 'Про нас',
    footerText: 'ГорПляж · Одеса, пляж Отрада',
    homeMetaTitle: 'ГорПляж — пляж, ресторан, події в Одесі',
    homeMetaDescription: 'Онлайн-бронювання столів, афіша подій та карта зон GorPliaj на пляжі Отрада.',
    eventsMetaTitle: 'Події · ГорПляж',
    eventsMetaDescription: 'Актуальна афіша подій GorPliaj: вечірки, концерти, special-івенти.',
    aboutMetaTitle: 'Про ГорПляж',
    aboutMetaDescription: 'Інформація про локацію, контакти та формат відпочинку в ГорПляжі.',
    bookingTitle: 'Бронювання',
    mapTitle: 'Карта закладу',
    mapSubtitle: 'Актуальні статуси місць завантажуються з API доступності.',
    mapZoomIn: 'Збільшити',
    mapZoomOut: 'Зменшити',
    mapZoomReset: '100%',
    mapSelectedTitle: 'Вибране місце',
    mapSelectHint: 'Натисніть на місце в зоні, щоб вибрати його.',
    mapGoToBooking: 'Перейти до заявки',
    mapFree: 'Вільно',
    mapHeld: 'У hold',
    mapBusy: 'Зайнято',
    mapNoFit: 'Не підходить за гостями',
    mapSource: 'Джерело: API',
    mapLoadFailed: 'Не вдалося завантажити карту.',
    menuMetaTitle: 'Меню · ГорПляж',
    menuMetaDescription: 'Актуальне меню ГорПляжу з категоріями, лайками та швидким формуванням замовлення.',
    menuTitle: 'Меню ГорПляжу',
    menuSubtitle: 'Страви та барні позиції з API. Додайте позиції в кошик, щоб зібрати замовлення.',
    menuLoading: 'Завантаження меню…',
    menuEmpty: 'Меню тимчасово порожнє.',
    menuError: 'Не вдалося завантажити меню. Спробуйте пізніше.',
    menuSectionKitchen: 'Кухня',
    menuSectionBar: 'Бар',
    menuLike: 'Подобається',
    menuCartTitle: 'Моє замовлення',
    menuCartTotal: 'Разом',
    menuCartCopy: 'Скопіювати',
    menuCartClear: 'Очистити'
  },
  en: {
    brandSubtitle: 'Beach · Restaurant · Events',
    navHome: 'Home',
    navEvents: 'Events',
    navMenu: 'Menu',
    navBooking: 'Booking',
    navMap: 'Map',
    navAbout: 'About',
    footerText: 'GorPliaj · Odesa, Otrada Beach',
    homeMetaTitle: 'GorPliaj — beach, restaurant, events in Odesa',
    homeMetaDescription: 'Online table booking, event listings and venue map for GorPliaj at Otrada beach.',
    eventsMetaTitle: 'Events · GorPliaj',
    eventsMetaDescription: 'Current GorPliaj events: parties, live sets and special evenings.',
    aboutMetaTitle: 'About GorPliaj',
    aboutMetaDescription: 'Location details, contacts and visiting format for GorPliaj.',
    bookingTitle: 'Booking',
    mapTitle: 'Venue map',
    mapSubtitle: 'Live seat statuses are loaded from the availability API.',
    mapZoomIn: 'Zoom in',
    mapZoomOut: 'Zoom out',
    mapZoomReset: '100%',
    mapSelectedTitle: 'Selected table',
    mapSelectHint: 'Tap a table in the zone to select it.',
    mapGoToBooking: 'Proceed to booking',
    mapFree: 'Free',
    mapHeld: 'Held',
    mapBusy: 'Busy',
    mapNoFit: 'Not suitable by guests',
    mapSource: 'Source: API',
    mapLoadFailed: 'Failed to load the map.',
    menuMetaTitle: 'Menu · GorPliaj',
    menuMetaDescription: 'Live GorPliaj menu with categories, likes and quick cart creation.',
    menuTitle: 'GorPliaj Menu',
    menuSubtitle: 'Kitchen and bar positions from API. Add items to cart to build your order.',
    menuLoading: 'Loading menu…',
    menuEmpty: 'Menu is temporarily empty.',
    menuError: 'Failed to load menu. Please try again later.',
    menuSectionKitchen: 'Kitchen',
    menuSectionBar: 'Bar',
    menuLike: 'Like item',
    menuCartTitle: 'My order',
    menuCartTotal: 'Total',
    menuCartCopy: 'Copy order',
    menuCartClear: 'Clear'
  }
};

export const locale = writable<Locale>('uk');

export const t = derived(locale, ($locale) => {
  return (key: string) => dictionary[$locale][key] ?? key;
});

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'uk';

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'uk' || saved === 'en') {
    return saved;
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'uk';
}

export function applyLocale(nextLocale: Locale) {
  locale.set(nextLocale);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = nextLocale;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }
}
