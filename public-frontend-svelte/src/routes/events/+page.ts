import { eventsApi } from '$lib/api/events';

export async function load() {
  return {
    eventsPromise: eventsApi.list(true)
  };
}
