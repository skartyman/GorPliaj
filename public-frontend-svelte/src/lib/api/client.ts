const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    ...init
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string' && payload.message.length) {
        message = payload.message;
      }
    } catch {
      // ignore json parse errors
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
};
