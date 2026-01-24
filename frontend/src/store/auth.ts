import { create } from 'zustand';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const { user, token } = await authApi.login({ username, password });
    Cookies.set('token', token, { expires: 7 });
    set({ user, isAuthenticated: true });
  },

  register: async (username: string, password: string) => {
    const { user, token } = await authApi.register({ username, password });
    Cookies.set('token', token, { expires: 7 });
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      Cookies.remove('token');
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchUser: async () => {
    const token = Cookies.get('token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      Cookies.remove('token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
