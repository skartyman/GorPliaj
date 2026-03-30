import { apiClient } from './client';
import type { EventItem, EventListResult } from '$lib/features/events/types';

async function list(includePast = true): Promise<EventListResult> {
  const events = await apiClient.get<EventItem[]>(`/events?includePast=${includePast ? '1' : '0'}`);
  return { events, source: 'api' };
}

async function bySlug(slug: string): Promise<{ event: EventItem; source: 'api' }> {
  const event = await apiClient.get<EventItem>(`/events/${encodeURIComponent(slug)}`);
  return { event, source: 'api' };
}

export const eventsApi = {
  list,
  bySlug
};
