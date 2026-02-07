import { create } from 'zustand';
import { adminApi } from '@/lib/api';
import type { AdminUser, AdminProject, UserCreateData, UserUpdateData } from '@/types';

interface AdminState {
  // 用户管理状态
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  isLoading: boolean;
  error: string | null;

  // 项目管理状态
  projects: AdminProject[];
  projectsTotal: number;
  projectsPage: number;
  projectsPageSize: number;
  projectsTotalPages: number;
  projectsSearch: string;
  projectsSortBy: string;
  projectsSortOrder: 'asc' | 'desc';
  projectsLoading: boolean;
  projectsError: string | null;

  // 用户管理方法
  fetchUsers: (params?: { page?: number; search?: string }) => Promise<void>;
  createUser: (data: UserCreateData) => Promise<void>;
  updateUser: (id: string, data: UserUpdateData) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;

  // 项目管理方法
  fetchProjects: (params?: {
    page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setProjectsSearch: (search: string) => void;
  setProjectsPage: (page: number) => void;
  setProjectsSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // 用户管理初始状态
  users: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  search: '',
  isLoading: false,
  error: null,

  // 项目管理初始状态
  projects: [],
  projectsTotal: 0,
  projectsPage: 1,
  projectsPageSize: 10,
  projectsTotalPages: 1,
  projectsSearch: '',
  projectsSortBy: 'updatedAt',
  projectsSortOrder: 'desc',
  projectsLoading: false,
  projectsError: null,

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

  // 项目管理方法
  fetchProjects: async (params) => {
    const state = get();
    const page = params?.page ?? state.projectsPage;
    const search = params?.search ?? state.projectsSearch;
    const sortBy = params?.sortBy ?? state.projectsSortBy;
    const sortOrder = params?.sortOrder ?? state.projectsSortOrder;

    set({ projectsLoading: true, projectsError: null });

    try {
      const result = await adminApi.listProjects({
        page,
        pageSize: state.projectsPageSize,
        search,
        sortBy,
        sortOrder,
      });

      set({
        projects: result.items,
        projectsTotal: result.total,
        projectsPage: result.page,
        projectsTotalPages: result.totalPages,
        projectsSearch: search,
        projectsSortBy: sortBy,
        projectsSortOrder: sortOrder,
        projectsLoading: false,
      });
    } catch (err) {
      set({
        projectsError: err instanceof Error ? err.message : '获取项目列表失败',
        projectsLoading: false,
      });
    }
  },

  deleteProject: async (id) => {
    set({ projectsLoading: true, projectsError: null });

    try {
      await adminApi.deleteProject(id);
      await get().fetchProjects();
    } catch (err) {
      set({
        projectsError: err instanceof Error ? err.message : '删除项目失败',
        projectsLoading: false,
      });
      throw err;
    }
  },

  setProjectsSearch: (search) => {
    set({ projectsSearch: search });
  },

  setProjectsPage: (page) => {
    set({ projectsPage: page });
  },

  setProjectsSort: (sortBy, sortOrder) => {
    set({ projectsSortBy: sortBy, projectsSortOrder: sortOrder });
  },
}));
