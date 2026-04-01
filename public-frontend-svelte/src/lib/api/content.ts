import { apiClient } from './client';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const contentApi = {
  news: (customFetch?: FetchLike) => apiClient.get('/news', customFetch),
  menu: (customFetch?: FetchLike) => apiClient.get('/menu', customFetch)
};
