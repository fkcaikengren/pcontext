import { create } from 'zustand';
import { devtools } from 'zustand/middleware'

import {client , parseRes, } from '@/APIs'
import type { UserVO } from '@/APIs'
export type UserRole = 'admin' | 'user' | 'guest';


type AuthUser = Pick<UserVO, 'id' | 'username' | 'role'> | null;


interface AuthState {
  user: AuthUser ;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  initialized: boolean;
  setUser: (user: AuthUser, isAuthenticated: boolean) => void;
  auth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(devtools((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,
  setUser(user, isAuthenticated) {
    set({ user, isAuthenticated, initialized: true, loading: false, error: null });
  },
  async auth() {
    console.log('start auth ....')
    set({ loading: true, error: null });
    try {
      const user = await parseRes(client.users.me.$get());
      const userRole = user?.role;
      const isAuthenticated = (userRole ?? 'guest') !== 'guest';
      set({ user, isAuthenticated, initialized: true, loading: false, error: null });
    } catch (error) {
      console.error('Auth failed:', error);
      set({ user: null, isAuthenticated: false, initialized: true, loading: false, error: String(error) });
    }
  },
  async login({ username, password }) {
    // 登录请求，服务器会设置 cookie
    try {
      const user = await parseRes(client.users.login.$post({json: { username, password }}))
      set({ user, isAuthenticated:true, initialized: true, loading: false, error: null });
      console.log('Login successful:', user);
    } catch (error) {
      console.error('Login failed:', error);
    }
  },
  async logout() {
    await parseRes(client.users.logout.$post());
    set({ user: null, isAuthenticated: false, initialized: true, loading: false, error: null });
  }
})));
