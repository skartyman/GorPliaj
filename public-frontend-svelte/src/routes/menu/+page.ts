import { menuApi } from '$lib/api/menu';

export function load() {
  return {
    menuPromise: menuApi.list()
  };
}
