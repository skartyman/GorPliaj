import { contentApi } from '$lib/api/content';
import { eventsApi } from '$lib/api/events';

export async function load() {
  const eventsResult = await eventsApi.list(false);

  let menuCount = 0;
  let menuSource: 'api' | 'unavailable' = 'unavailable';
  try {
    const menu = await contentApi.menu();
    menuCount = Array.isArray(menu)
      ? menu.reduce((acc, category) => acc + (Array.isArray(category?.items) ? category.items.length : 0), 0)
      : 0;
    menuSource = 'api';
  } catch {
    menuCount = 0;
  }

  return {
    events: eventsResult.events.slice(0, 3),
    eventsSource: eventsResult.source,
    menuCount,
    menuSource
  };
}
