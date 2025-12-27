import { create } from 'zustand';

import { alovaInstance } from '@/lib/alova';

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserPermissions {
  routes: Record<string, boolean>;
}

export interface User {
  id: number | null;
  username?: string;
  name?: string;
  role?: UserRole;
  phone?: string;
  email?: string;
  status?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  permissions?: UserPermissions;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  initialized: boolean;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  async login({ username, password }) {
    const method = alovaInstance.Post<User>(
      '/users/login',
      {
        username,
        password,
      }
    );

    const result = await method.send();

    set({
      user: result,
      isAuthenticated: true,
      initialized: true,
    });
  },
  async logout() {
    const method = alovaInstance.Post<unknown>(
      '/users/logout',
    );

    await method.send();
    set({ user: null, isAuthenticated: false, initialized: true });
  },
  async fetchMe() {
    try {
      const method = alovaInstance.Get<User>('/users/me');
      const result = await method.send();
      set((state) => ({
        user: state.user ? { ...state.user, ...result } : result,
        isAuthenticated: (result.role ?? 'guest') !== 'guest',
        initialized: true,
      }));
    } catch {
      set({ user: null, isAuthenticated: false, initialized: true });
    }
  },
}));
