import { derived, writable } from 'svelte/store';

export type Locale = 'uk' | 'en';

const STORAGE_KEY = 'gorpliaj-locale';

export const dictionary: Record<Locale, Record<string, string>> = {
  uk: {
    brandSubtitle: 'Beach · Restaurant · Events',
    navHome: 'Головна',
    navEvents: 'Події',
    navBooking: 'Бронювання',
    navMap: 'Мапа',
    navAbout: 'Про нас',
    footerText: 'ГорПляж · Одеса, пляж Отрада',
    homeMetaTitle: 'ГорПляж — пляж, ресторан, події в Одесі',
    homeMetaDescription: 'Онлайн-бронювання столів, афіша подій та карта зон GorPliaj на пляжі Отрада.',
    bookingTitle: 'Бронювання',
    mapTitle: 'Карта закладу'
  },
  en: {
    brandSubtitle: 'Beach · Restaurant · Events',
    navHome: 'Home',
    navEvents: 'Events',
    navBooking: 'Booking',
    navMap: 'Map',
    navAbout: 'About',
    footerText: 'GorPliaj · Odesa, Otrada Beach',
    homeMetaTitle: 'GorPliaj — beach, restaurant, events in Odesa',
    homeMetaDescription: 'Online table booking, event listings and venue map for GorPliaj at Otrada beach.',
    bookingTitle: 'Booking',
    mapTitle: 'Venue map'
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
