export interface User {
  _id: string;
  username: string;
  avatar?: string;
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
