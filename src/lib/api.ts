import { Platform } from 'react-native';

import { API_URL } from '@/lib/config';
import { clearToken, getToken } from '@/lib/token';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  optionalAuth?: boolean;
  headers?: Record<string, string>;
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
      ...(options.headers || {}),
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

export function uploadFile<T = any>(
  path: string,
  fields: Record<string, string>,
  file: { uri: string; name: string; type: string },
  fileField: string,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const token = await getToken();
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    if (Platform.OS === 'web') {
      // Web FormData needs a real Blob; the native {uri,name,type} shape becomes "[object Object]".
      try {
        const blob = await (await fetch(file.uri)).blob();
        form.append(fileField, new File([blob], file.name, { type: file.type || blob.type }));
      } catch {
        reject(new Error('Could not read the selected file.'));
        return;
      }
    } else {
      form.append(fileField, file as unknown as Blob);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Network error. Please try again.'));
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload as T);
      else reject(new Error(payload?.message || 'Upload failed'));
    };
    xhr.send(form);
  });
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
