import { create } from 'zustand';

import { Api } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/token';

type Profile = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
};

type SessionState = {
  initialized: boolean;
  token: string | null;
  profile: Profile | null;
  hydrate: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

function normalizeProfile(input: any): Profile | null {
  if (!input || typeof input !== 'object') return null;
  const roles = Array.isArray(input.roles)
    ? input.roles.map((role: any) => String(role?.name || role?.role_name || role))
    : [];
  return {
    id: String(input.id || ''),
    username: input.username || '',
    email: input.email || '',
    firstName: input.firstName || input.firstname || '',
    lastName: input.lastName || input.lastname || '',
    roles,
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  initialized: false,
  token: null,
  profile: null,

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ token: null, profile: null, initialized: true });
      return;
    }
    set({ token });
    try {
      await get().refreshProfile();
    } catch (_error) {
      await clearToken();
      set({ token: null, profile: null });
    } finally {
      set({ initialized: true });
    }
  },

  login: async (identifier, password) => {
    const payload = identifier.includes('@')
      ? { email: identifier, password }
      : { username: identifier, password };
    const result = await Api.post<any>('/auth/login', payload, false);
    const data = result?.data || result;
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
    set({ token: null, profile: null });
  },

  refreshProfile: async () => {
    const me = await Api.get<any>('/users/me');
    const normalized = normalizeProfile(me?.data || me);
    set({ profile: normalized });
  },
}));
