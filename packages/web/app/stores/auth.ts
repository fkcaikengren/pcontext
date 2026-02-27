import { create } from 'zustand';

import {client , parseRes, } from '@/APIs'
import type { UserVO } from '@/APIs'
export type UserRole = 'admin' | 'user' | 'guest';


interface AuthState {
  user: UserVO | null;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  initialized: boolean;
  setUser: (user: UserVO | null, isAuthenticated: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  setUser(user, isAuthenticated) {
    set({ user, isAuthenticated, initialized: true });
  },
  async login({ username, password }) {
    // 登录请求，服务器会设置 cookie
    try {
      const user = await parseRes(client.users.login.$post({json: { username, password }}))
      set({ user, isAuthenticated:true, initialized: true });
      console.log('Login successful:', user);
    } catch (error) {
      console.error('Login failed:', error);
    }
  },
  async logout() {
    await parseRes(client.users.logout.$post());
    set({ user: null, isAuthenticated: false, initialized: true });
  }
}));
