import { apiClient } from './client';

export const contentApi = {
  news: () => apiClient.get('/news'),
  menu: () => apiClient.get('/menu')
};
