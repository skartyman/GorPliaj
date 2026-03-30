import { getPublicMapData } from '$lib/features/map/publicMapAdapter';

export async function load() {
  return {
    mapPromise: getPublicMapData()
  };
}
