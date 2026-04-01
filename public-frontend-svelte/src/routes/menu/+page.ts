import { menuApi } from '$lib/api/menu';

export function load({ fetch }: { fetch: typeof globalThis.fetch }) {
  return {
    menuPromise: menuApi.list(fetch)
  };
}
