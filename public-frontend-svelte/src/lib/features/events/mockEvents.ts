import type { EventItem } from './types';

export const mockEvents: EventItem[] = [
  {
    id: 9001,
    title: 'Sunset Sax & Sea Dinner',
    slug: 'sunset-sax-sea-dinner',
    shortDescription: 'Живий саксофон, вечірнє меню та вид на море на заході сонця.',
    fullDescription:
      'Вечірня програма з welcome-drink, сетом від шефа та живим sax-performance. Ідеально для романтичного вечора або камерної компанії.',
    posterImage: '/icons/zakat.jpg',
    startAt: '2026-04-05T18:30:00.000Z',
    endAt: '2026-04-05T22:00:00.000Z',
    ctaType: 'BOTH',
    ticketUrl: 'https://example.com/tickets/sunset-sax-sea-dinner'
  },
  {
    id: 9002,
    title: 'Beach Morning Brunch',
    slug: 'beach-morning-brunch',
    shortDescription: 'Повільний ранковий бранч біля моря з DJ-ambient сетом.',
    fullDescription:
      'Легкий ранковий формат: авторські сніданки, кава та лаунж-атмосфера для сімей і друзів.',
    posterImage: '/icons/photo_2026-03-22_18-51-20.jpg',
    startAt: '2026-04-12T08:00:00.000Z',
    endAt: '2026-04-12T12:30:00.000Z',
    ctaType: 'BOOKING',
    ticketUrl: ''
  },
  {
    id: 9003,
    title: 'Night by the Pier',
    slug: 'night-by-the-pier',
    shortDescription: 'Нічний формат біля пірсу: DJ set та авторські коктейлі.',
    fullDescription:
      'П’ятнична нічна програма для тих, хто хоче поєднати пляжний вайб, танці та гастрономію.',
    posterImage: '/icons/piano.jpg',
    startAt: '2026-04-18T19:00:00.000Z',
    endAt: '2026-04-19T00:00:00.000Z',
    ctaType: 'TICKETS',
    ticketUrl: 'https://example.com/tickets/night-by-the-pier'
  }
];
