import { create } from 'zustand';

import { Api, setUnauthorizedHandler } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/token';

type Profile = {
  id: string;
  username?: string;
  email?: string;
  fullName?: string;
  roles?: string[];
};

type SessionState = {
  initialized: boolean;
  guestMode: boolean;
  token: string | null;
  profile: Profile | null;
  enterGuestMode: () => void;
  hydrate: () => Promise<void>;
  login: (identifier: string) => Promise<{ email: string; maskedEmail: string } | null>;
  verifyLoginCode: (email: string, code: string) => Promise<void>;
  completeLogin: (data: any) => Promise<void>;
  googleAuth: (idToken: string, intent: 'login' | 'register', mode?: 'student' | 'instructor') => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

function normalizeProfile(input: any): Profile | null {
  if (!input || typeof input !== 'object') return null;
  const roles = Array.isArray(input.roles)
    ? Array.from(
        new Set(
          input.roles
            .map((role: any) => String(role?.name || role?.role_name || role || '').toUpperCase())
            .filter(Boolean),
        ),
      )
    : [];
  return {
    id: String(input.id || ''),
    username: input.username || '',
    email: input.email || '',
    fullName: input.fullName || '',
    roles,
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  initialized: false,
  guestMode: false,
  token: null,
  profile: null,

  enterGuestMode: () => set({ guestMode: true }),
  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ token: null, profile: null, initialized: true });
      return;
    }
    set({ token });
    try {
      await get().refreshProfile();
    } catch {
      await clearToken();
      set({ token: null, profile: null });
    } finally {
      set({ initialized: true });
    }
  },

  login: async (identifier) => {
    const payload = identifier.includes('@')
      ? { email: identifier }
      : { username: identifier };
    const result = await Api.post<any>('/auth/login', payload, false);
    const data = result?.data || result;
    if (data?.requires_email_code) {
      return { email: String(data.email), maskedEmail: String(data.masked_email || data.email) };
    }
    if (data?.requires_2fa) {
      throw new Error('Two-factor authentication is not supported in the app yet.');
    }
    await get().completeLogin(data);
    return null;
  },

  verifyLoginCode: async (email, code) => {
    const result = await Api.post<any>('/auth/login/verify', { email, code }, false);
    await get().completeLogin(result?.data || result);
  },

  googleAuth: async (idToken, intent, mode = 'student') => {
    const result = await Api.post<any>('/auth/google', { idToken, intent, mode }, false);
    const data = result?.data?.data || result?.data || result;
    if (data?.requires_2fa || data?.status === 'requires_2fa') {
      throw new Error('Two-factor authentication is not supported in the app yet.');
    }
    await get().completeLogin(data);
  },

  completeLogin: async (data) => {
    const accessToken = data?.accessToken || data?.token || null;
    if (!accessToken) {
      throw new Error('Login failed');
    }
    await setToken(accessToken);
    set({ token: accessToken, profile: normalizeProfile(data?.user) });
    await get().refreshProfile();
  },

  logout: async () => {
    await clearToken();
      set({ token: null, profile: null, guestMode: false });
  },

  refreshProfile: async () => {
    const me = await Api.get<any>('/users/me');
    const normalized = normalizeProfile(me?.data || me);
    set({ profile: normalized });
  },
}));

setUnauthorizedHandler(() => {
  useSessionStore.setState({ token: null, profile: null, initialized: true });
});
