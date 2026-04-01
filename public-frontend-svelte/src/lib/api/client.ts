const API_BASE = '/api';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveFetch(customFetch?: FetchLike): FetchLike {
  if (customFetch) return customFetch;
  return fetch;
}

async function request<T>(path: string, init?: RequestInit, customFetch?: FetchLike): Promise<T> {
  const response = await resolveFetch(customFetch)(`${API_BASE}${path}`, {
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
  get: <T>(path: string, customFetch?: FetchLike) => request<T>(path, undefined, customFetch),
  post: <T>(path: string, body: unknown, customFetch?: FetchLike) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(body)
      },
      customFetch
    )
};
