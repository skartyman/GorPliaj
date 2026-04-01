import { apiClient } from './client';

export type ServiceRequestStatus =
  | 'NEW'
  | 'TRIAGE'
  | 'WAITING_MANAGER'
  | 'WAITING_CLIENT'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'DONE'
  | 'CANCELLED';

export type ClientProfile = {
  id: string;
  telegramUserId: string;
  name: string;
  phone: string;
};

export type Equipment = {
  id: string;
  clientId: string;
  name: string;
  serialNumber: string;
  internalNumber: string;
};

export type MediaAttachment = {
  id: string;
  type: 'photo' | 'video';
  url: string;
};

export type ServiceRequest = {
  id: string;
  clientId: string;
  equipmentId: string;
  category: string;
  description: string;
  urgency: string;
  canOperateNow: boolean;
  attachments: MediaAttachment[];
  status: ServiceRequestStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  source: 'telegram_mini_app';
};

export async function fetchClientProfile(telegramUserId: string): Promise<ClientProfile> {
  return apiClient.get(`/telegram/clients/me?telegramUserId=${encodeURIComponent(telegramUserId)}`);
}

export async function fetchClientEquipment(clientId: string): Promise<Equipment[]> {
  return apiClient.get(`/telegram/clients/me/equipment?clientId=${encodeURIComponent(clientId)}`);
}

export async function createServiceRequest(payload: Partial<ServiceRequest>): Promise<ServiceRequest> {
  return apiClient.post('/telegram/service-requests', payload);
}

export async function fetchServiceHistory(clientId: string): Promise<ServiceRequest[]> {
  return apiClient.get(`/telegram/clients/${clientId}/service-requests`);
}

export async function fetchServiceRequest(id: string): Promise<ServiceRequest> {
  return apiClient.get(`/telegram/service-requests/${id}`);
}

export async function uploadMedia(file: File): Promise<MediaAttachment> {
  const formData = new FormData();
  formData.append('media', file);

  const response = await fetch('/api/telegram/service-requests/media', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Не удалось загрузить файл');
  }

  return response.json();
}
