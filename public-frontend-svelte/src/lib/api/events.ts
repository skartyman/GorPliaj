import { apiClient } from './client';
import type { EventItem, EventListResult } from '$lib/features/events/types';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function list(includePast = true, customFetch?: FetchLike): Promise<EventListResult> {
  const events = await apiClient.get<EventItem[]>(`/events?includePast=${includePast ? '1' : '0'}`, customFetch);
  return { events, source: 'api' };
}

async function bySlug(slug: string, customFetch?: FetchLike): Promise<{ event: EventItem; source: 'api' }> {
  const event = await apiClient.get<EventItem>(`/events/${encodeURIComponent(slug)}`, customFetch);
  return { event, source: 'api' };
}

export const eventsApi = {
  list,
  bySlug
};
