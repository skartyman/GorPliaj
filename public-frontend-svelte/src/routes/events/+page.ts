import { eventsApi } from '$lib/api/events';

export async function load({ fetch }) {
  return {
    eventsPromise: eventsApi.list(true, fetch)
  };
}
