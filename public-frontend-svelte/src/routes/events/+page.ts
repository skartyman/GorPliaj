import { eventsApi } from '$lib/api/events';

export async function load() {
  const events = await eventsApi.list(true);

  return {
    events
  };
}
