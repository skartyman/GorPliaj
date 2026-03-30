import { apiClient } from './client';

export const mapApi = {
  defaultMap: () => apiClient.get('/maps/default'),
  availability: (mapId: number, reservationDate: string, timeFrom: string, timeTo: string) =>
    apiClient.get(
      `/maps/${mapId}/availability?reservationDate=${encodeURIComponent(reservationDate)}&timeFrom=${encodeURIComponent(timeFrom)}&timeTo=${encodeURIComponent(timeTo)}`
    )
};
