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

export interface EventListResult {
  events: EventItem[];
  source: 'api';
}
