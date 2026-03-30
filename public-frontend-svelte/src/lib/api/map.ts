import { apiClient } from './client';

export const mapApi = {
  defaultMap: <T = unknown>() => apiClient.get<T>('/maps/default'),
  availability: <T = unknown>(mapId: number, reservationDate: string, timeFrom: string, timeTo: string) =>
    apiClient.get<T>(
      `/maps/${mapId}/availability?date=${encodeURIComponent(reservationDate)}&timeFrom=${encodeURIComponent(timeFrom)}&timeTo=${encodeURIComponent(timeTo)}`
    )
};
