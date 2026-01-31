import { create } from 'zustand';
import { adminApi } from '@/lib/api';
import type { AdminUser, PaginatedUsers, UserCreateData, UserUpdateData } from '@/types';

interface AdminState {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  isLoading: boolean;
  error: string | null;

  fetchUsers: (params?: { page?: number; search?: string }) => Promise<void>;
  createUser: (data: UserCreateData) => Promise<void>;
  updateUser: (id: string, data: UserUpdateData) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  search: '',
  isLoading: false,
  error: null,

  fetchUsers: async (params) => {
    const state = get();
    const page = params?.page ?? state.page;
    const search = params?.search ?? state.search;

    set({ isLoading: true, error: null });

    try {
      const result = await adminApi.listUsers({
        page,
        pageSize: state.pageSize,
        search,
      });

      set({
        users: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        search,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '获取用户列表失败',
        isLoading: false,
      });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.createUser(data);
      await get().fetchUsers({ page: 1 });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '创建用户失败',
        isLoading: false,
      });
      throw err;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.updateUser(id, data);
      await get().fetchUsers();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '更新用户失败',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.deleteUser(id);
      await get().fetchUsers();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '删除用户失败',
        isLoading: false,
      });
      throw err;
    }
  },

  resetPassword: async (id, newPassword) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.resetPassword(id, newPassword);
      set({ isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '重置密码失败',
        isLoading: false,
      });
      throw err;
    }
  },

  setSearch: (search) => {
    set({ search });
  },

  setPage: (page) => {
    set({ page });
  },
}));
