import { apiClient } from './client';

export interface MenuItem {
  id: number;
  name: string | Record<string, string>;
  description?: string | Record<string, string>;
  price: number;
  imageUrl?: string;
  likesCount?: number;
}

export interface MenuCategory {
  id: number;
  name: string | Record<string, string>;
  section?: string;
  items: MenuItem[];
}

export const menuApi = {
  list: (customFetch?: typeof fetch) => apiClient.get<MenuCategory[]>('/menu', customFetch),
  setLike: (itemId: number, liked: boolean, customFetch?: typeof fetch) =>
    apiClient.post<{ item: MenuItem }>(`/menu/items/${itemId}/like`, { liked }, customFetch)
};
