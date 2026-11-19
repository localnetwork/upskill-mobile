import { API_URL } from '@/lib/config';
import { clearToken, getToken } from '@/lib/token';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  optionalAuth?: boolean;
};

type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function shouldAutoLogout(status: number, payload: any, auth: boolean) {
  if (!auth || status !== 401) return false;
  const message = String(payload?.message || payload?.error || '').toLowerCase();
  return (
    !message ||
    message.includes('expired') ||
    message.includes('invalid') ||
    message.includes('unauthorized')
  );
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const auth = options.auth !== false;
  const token = auth || options.optionalAuth ? await getToken() : null;
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    if (shouldAutoLogout(response.status, payload, auth)) {
      await clearToken();
      if (unauthorizedHandler) {
        await unauthorizedHandler();
      }
    }
    const message = payload?.message || 'Request failed';
    const error = new Error(message) as Error & { status?: number; data?: any };
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

export const Api = {
  get: <T = any>(path: string, auth = true) => apiRequest<T>(path, { method: 'GET', auth }),
  post: <T = any>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: 'POST', body, auth }),
  put: <T = any>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: 'PUT', body, auth }),
  patch: <T = any>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: 'PATCH', body, auth }),
  delete: <T = any>(path: string, auth = true) => apiRequest<T>(path, { method: 'DELETE', auth }),
};
