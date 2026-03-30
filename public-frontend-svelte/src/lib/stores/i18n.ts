import { writable } from 'svelte/store';

export type Locale = 'uk' | 'en';

export const locale = writable<Locale>('uk');

export const dictionary: Record<Locale, Record<string, string>> = {
  uk: {
    brandSubtitle: 'Beach · Restaurant · Events',
    navHome: 'Головна',
    navEvents: 'Події',
    navBooking: 'Бронювання',
    navMap: 'Мапа',
    navAbout: 'Про нас',
    comingSoon: 'Сторінка в процесі міграції на SvelteKit.',
    footerText: 'ГорПляж · Одеса, пляж Отрада'
  },
  en: {
    brandSubtitle: 'Beach · Restaurant · Events',
    navHome: 'Home',
    navEvents: 'Events',
    navBooking: 'Booking',
    navMap: 'Map',
    navAbout: 'About',
    comingSoon: 'This page is currently being migrated to SvelteKit.',
    footerText: 'GorPliaj · Odesa, Otrada Beach'
  }
};
