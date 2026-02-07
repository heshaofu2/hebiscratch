export interface User {
  _id: string;
  username: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  owner: string;
  projectJson: Record<string, unknown>;
  thumbnail?: string;
  isPublic: boolean;
  shareToken?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  _id: string;
  md5: string;
  type: 'costume' | 'sound' | 'backdrop';
  storageUrl: string;
  fileSize: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
  code?: string;
}

// Admin types
export interface AdminUser {
  _id: string;
  username: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  projectCount: number;
  updatedAt: string;
}

export interface PaginatedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserCreateData {
  username: string;
  password: string;
  role?: string;
  is_active?: boolean;
}

export interface UserUpdateData {
  username?: string;
  role?: string;
  is_active?: boolean;
}

// Admin Project types
export interface AdminProject {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  fileSize: number;
  isPublic: boolean;
  viewCount: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProjects {
  items: AdminProject[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
