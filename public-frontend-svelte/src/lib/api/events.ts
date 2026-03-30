import { apiClient } from './client';
import { mockEvents } from '$lib/features/events/mockEvents';
import type { EventItem, EventListResult } from '$lib/features/events/types';

async function list(includePast = true): Promise<EventListResult> {
  try {
    const events = await apiClient.get<EventItem[]>(`/events?includePast=${includePast ? '1' : '0'}`);
    return { events, source: 'api' };
  } catch {
    return { events: mockEvents, source: 'mock' };
  }
}

async function bySlug(slug: string): Promise<{ event: EventItem; source: 'api' | 'mock' }> {
  try {
    const event = await apiClient.get<EventItem>(`/events/${encodeURIComponent(slug)}`);
    return { event, source: 'api' };
  } catch {
    const fallback = mockEvents.find((item) => item.slug === slug);
    if (!fallback) {
      throw new Error('Event not found');
    }

    return { event: fallback, source: 'mock' };
  }
}

export const eventsApi = {
  list,
  bySlug
};
