import { error } from '@sveltejs/kit';
import { eventsApi } from '$lib/api/events';

export async function load({ params, fetch }) {
  try {
    return await eventsApi.bySlug(params.slug, fetch);
  } catch {
    throw error(404, 'Event not found');
  }
}
