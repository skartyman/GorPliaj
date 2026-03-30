import { apiClient } from './client';

export interface BookingPayload {
  tableId: number;
  mapId: number;
  zoneId: number;
  customerName: string;
  customerPhone: string;
  guests: number;
  reservationDate: string;
  timeFrom: string;
  timeTo: string;
  commentCustomer?: string;
}

export const bookingsApi = {
  create: (payload: BookingPayload) => apiClient.post('/reservations', payload)
};
