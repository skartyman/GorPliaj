import { contentApi } from '$lib/api/content';
import { eventsApi } from '$lib/api/events';

export async function load({ fetch }) {
  const eventsResult = await eventsApi.list(false, fetch);

  let menuPreviewImages: string[] = [];
  try {
    const menu = await contentApi.menu(fetch);
    const images = Array.isArray(menu)
      ? menu.flatMap((category) => (Array.isArray(category?.items) ? category.items.map((item) => item?.imageUrl).filter(Boolean) : []))
      : [];
    menuPreviewImages = images.slice(0, 8);
  } catch {
    menuPreviewImages = [];
  }

  let news: Array<{ id: number; title: string; summary?: string; publishedAt?: string }> = [];
  try {
    const newsResponse = await contentApi.news(fetch);
    news = Array.isArray(newsResponse) ? newsResponse.slice(0, 4) : [];
  } catch {
    news = [];
  }

  return {
    events: eventsResult.events.slice(0, 8),
    menuPreviewImages,
    news
  };
}
