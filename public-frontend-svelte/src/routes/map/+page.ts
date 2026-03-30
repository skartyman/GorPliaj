import { getPublicMapData } from '$lib/features/map/publicMapAdapter';

export async function load({ url }) {
  const date = url.searchParams.get('date') || undefined;
  const timeFrom = url.searchParams.get('timeFrom') || '12:00';
  const guests = Number(url.searchParams.get('guests') || '0');

  return {
    date,
    timeFrom,
    guests,
    mapPromise: getPublicMapData({ date, timeFrom })
  };
}
