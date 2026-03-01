import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import type {
  User,
  Project,
  AuthResponse,
  ApiError,
  DashboardStats,
  AdminUser,
  AdminUserDetail,
  PaginatedUsers,
  UserCreateData,
  UserUpdateData,
  AdminProject,
  PaginatedProjects,
  QuestionEntry,
  QuestionListItem,
  QuestionCreateData,
  QuestionUpdateData,
  QuestionBatchCreateData,
  ImageRecognitionResult,
  QuestionStats,
  PaperListItem,
  Paper,
  PaperCreateData,
  PaperUpdateData,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        const redirect = encodeURIComponent(window.location.pathname);
        window.location.href = `/auth/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    Cookies.remove('token');
  },
};

// Projects API
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  checkName: async (title: string): Promise<boolean> => {
    const response = await api.get<{ exists: boolean }>('/projects/check-name', {
      params: { title },
    });
    return response.data.exists;
  },

  get: async (id: string): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: { title: string; description?: string; projectJson: Record<string, unknown> }): Promise<Project> => {
    const response = await api.post<Project>('/projects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  uploadAsset: async (id: string, file: File): Promise<{ url: string; md5: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string; md5: string }>(`/projects/${id}/assets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  share: async (id: string): Promise<{ shareToken: string; shareUrl: string }> => {
    const response = await api.post<{ shareToken: string; shareUrl: string }>(`/projects/${id}/share`);
    return response.data;
  },

  unshare: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}/share`);
  },
};

// Share API (public)
export const shareApi = {
  getProject: async (token: string): Promise<Project> => {
    const response = await api.get<Project>(`/share/${token}`);
    return response.data;
  },
};

// Admin API
export const adminApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/admin/stats');
    return response.data;
  },

  listUsers: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedUsers> => {
    const response = await api.get<PaginatedUsers>('/admin/users', {
      params: {
        page: params.page || 1,
        page_size: params.pageSize || 10,
        search: params.search || undefined,
      },
    });
    return response.data;
  },

  getUser: async (id: string): Promise<AdminUserDetail> => {
    const response = await api.get<AdminUserDetail>(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: UserCreateData): Promise<AdminUser> => {
    const response = await api.post<AdminUser>('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: UserUpdateData): Promise<AdminUser> => {
    const response = await api.put<AdminUser>(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await api.post(`/admin/users/${id}/reset-password`, {
      new_password: newPassword,
    });
  },

  listProjects: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedProjects> => {
    const response = await api.get<PaginatedProjects>('/admin/projects', {
      params: {
        page: params.page || 1,
        page_size: params.pageSize || 10,
        search: params.search || undefined,
        sort_by: params.sortBy || 'updatedAt',
        sort_order: params.sortOrder || 'desc',
      },
    });
    return response.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/admin/projects/${id}`);
  },
};

// Questions API
export const questionsApi = {
  list: async (params?: {
    subject?: string[];
    mastered?: boolean;
    search?: string;
  }): Promise<QuestionListItem[]> => {
    const response = await api.get<QuestionListItem[]>('/questions', {
      params,
      paramsSerializer: { indexes: null },
    });
    return response.data;
  },

  get: async (id: string): Promise<QuestionEntry> => {
    const response = await api.get<QuestionEntry>(`/questions/${id}`);
    return response.data;
  },

  create: async (data: QuestionCreateData): Promise<QuestionEntry> => {
    const response = await api.post<QuestionEntry>('/questions', data);
    return response.data;
  },

  createBatch: async (data: QuestionBatchCreateData): Promise<QuestionEntry[]> => {
    const response = await api.post<QuestionEntry[]>('/questions/batch', data);
    return response.data;
  },

  update: async (id: string, data: QuestionUpdateData): Promise<QuestionEntry> => {
    const response = await api.put<QuestionEntry>(`/questions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/questions/${id}`);
  },

  review: async (id: string): Promise<QuestionEntry> => {
    const response = await api.post<QuestionEntry>(`/questions/${id}/review`);
    return response.data;
  },

  recognizeImage: async (file: File): Promise<ImageRecognitionResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImageRecognitionResult>('/questions/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // AI 识别可能较慢
    });
    return response.data;
  },

  getSubjects: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/questions/subjects');
    return response.data;
  },

  batchDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await api.post<{ deleted: number }>('/questions/batch-delete', { ids });
    return response.data;
  },

  batchUpdate: async (ids: string[], update: QuestionUpdateData): Promise<{ updated: number }> => {
    const response = await api.post<{ updated: number }>('/questions/batch-update', { ids, update });
    return response.data;
  },

  getStats: async (): Promise<QuestionStats> => {
    const response = await api.get<QuestionStats>('/questions/stats');
    return response.data;
  },

  getImageUrl: async (id: string): Promise<string> => {
    const response = await api.get(`/questions/${id}/image`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },

  getSourceImageUrl: async (id: string): Promise<string> => {
    const response = await api.get(`/questions/${id}/source-image`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
};

// Papers API
export const papersApi = {
  list: async (params?: {
    subject?: string;
    search?: string;
  }): Promise<PaperListItem[]> => {
    const response = await api.get<PaperListItem[]>('/papers', { params });
    return response.data;
  },

  get: async (id: string): Promise<Paper> => {
    const response = await api.get<Paper>(`/papers/${id}`);
    return response.data;
  },

  create: async (data: PaperCreateData): Promise<PaperListItem> => {
    const response = await api.post<PaperListItem>('/papers', data);
    return response.data;
  },

  update: async (id: string, data: PaperUpdateData): Promise<Paper> => {
    const response = await api.put<Paper>(`/papers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/papers/${id}`);
  },

  addQuestions: async (id: string, questionIds: string[]): Promise<{ added: number; total: number }> => {
    const response = await api.post<{ added: number; total: number }>(`/papers/${id}/questions`, { questions: questionIds });
    return response.data;
  },
};

export default api;
