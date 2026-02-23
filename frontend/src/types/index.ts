export interface User {
  _id: string;
  username: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  recognizeLimit: number | null;
  recognizeCount: number;
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
  recognizeLimit: number | null;
  recognizeCount: number;
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
  recognize_limit?: number | null;
}

export interface UserUpdateData {
  username?: string;
  role?: string;
  is_active?: boolean;
  recognize_limit?: number | null;
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

// ── 错题本类型 ──────────────────────────────────

export const SUBJECTS = [
  '语文', '数学', '英语', '物理', '化学',
  '生物', '历史', '地理', '政治', '未知', '其他',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export interface MistakeEntry {
  _id: string;
  subject: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  analysis?: string;
  source: 'manual' | 'image';
  sourceImagePath?: string;
  sourceImageUrl?: string;
  croppedImagePath?: string;
  croppedImageUrl?: string;
  knowledgePoints: string[];
  isMastered: boolean;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MistakeListItem {
  _id: string;
  subject: string;
  question: string;
  isMastered: boolean;
  reviewCount: number;
  source: string;
  knowledgePoints: string[];
  createdAt: string;
}

export interface MistakeCreateData {
  subject: string;
  question: string;
  wrongAnswer?: string;
  correctAnswer?: string;
  analysis?: string;
  knowledgePoints?: string[];
}

export interface MistakeUpdateData {
  subject?: string;
  question?: string;
  wrongAnswer?: string;
  correctAnswer?: string;
  analysis?: string;
  knowledgePoints?: string[];
  isMastered?: boolean;
}

export interface MistakeBatchCreateData {
  items: {
    subject: string;
    question: string;
    wrongAnswer?: string;
    correctAnswer?: string;
    analysis?: string;
    sourceImagePath?: string;
    croppedImagePath?: string;
  }[];
  sourceImagePath?: string;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RecognizedQuestion {
  index: number;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  analysis: string;
  subjectGuess: string;
  bbox: BBox;
  croppedImagePath?: string;
}

export interface ImageRecognitionResult {
  imagePath: string;
  questions: RecognizedQuestion[];
}

export interface MistakeStats {
  total: number;
  mastered: number;
  unmastered: number;
  subjects: Record<string, number>;
}

// ── 试卷类型 ──────────────────────────────────

export interface PaperListItem {
  _id: string;
  title: string;
  description: string;
  subject?: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paper {
  _id: string;
  title: string;
  description: string;
  subject?: string;
  questions: MistakeEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PaperCreateData {
  title: string;
  description?: string;
  subject?: string;
  questions: string[];
}

export interface PaperUpdateData {
  title?: string;
  description?: string;
  subject?: string;
  questions?: string[];
}
