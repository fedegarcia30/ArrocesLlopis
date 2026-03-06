import { auth } from '../config/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

let backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    // Ping an endpoint that we know exists so we don't get a 404.
    // However, some endpoints require auth. Let's just catch the fetch. If it responds with anything (even 401/404), the backend is up.
    await fetch(BASE_URL + '/availability/check', { method: 'OPTIONS', signal: AbortSignal.timeout(2000) });
    backendAvailable = true;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
      backendAvailable = false;
      console.warn('[API] Backend no disponible en', BASE_URL);
    } else {
      backendAvailable = true;
    }
  }
  return backendAvailable;
}

async function getAuthToken(): Promise<string | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}


async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const available = await checkBackend();
  if (!available) {
    throw new ApiError(0, 'Backend no disponible');
  }

  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, error.message || 'Error de servidor');
  }

  return response.json();
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

export function post<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function put<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function patch<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, {
    method: 'DELETE',
  });
}
