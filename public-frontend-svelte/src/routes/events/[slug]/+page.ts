import { error } from '@sveltejs/kit';
import { eventsApi } from '$lib/api/events';

export async function load({ params }) {
  try {
    return await eventsApi.bySlug(params.slug);
  } catch {
    throw error(404, 'Event not found');
  }
}
