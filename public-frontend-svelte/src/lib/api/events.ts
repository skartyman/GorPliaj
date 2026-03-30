import { apiClient } from './client';

export interface EventItem {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  posterImage: string;
  startAt: string;
  endAt: string | null;
  ctaType: 'BOOKING' | 'TICKETS' | 'BOTH';
  ticketUrl: string;
}

export const eventsApi = {
  list: (includePast = true) => apiClient.get<EventItem[]>(`/events?includePast=${includePast ? '1' : '0'}`),
  bySlug: (slug: string) => apiClient.get<EventItem>(`/events/${encodeURIComponent(slug)}`)
};
