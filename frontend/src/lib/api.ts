import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import type { User, Project, AuthResponse, ApiError } from '@/types';

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
        window.location.href = '/auth/login';
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

export default api;
