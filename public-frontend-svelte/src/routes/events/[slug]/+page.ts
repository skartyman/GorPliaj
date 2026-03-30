import { error } from '@sveltejs/kit';
import { eventsApi } from '$lib/api/events';

export async function load({ params }) {
  try {
    const event = await eventsApi.bySlug(params.slug);
    return { event };
  } catch {
    throw error(404, 'Event not found');
  }
}
