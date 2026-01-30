export type Subject = 'math' | 'chinese' | 'english' | 'physics' | 'chemistry' | 'biology' | 'other';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MistakeQuestion {
  _id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  imagePaths: string[];
  questionContent: string;
  answerContent: string;
  myAnswer: string;
  analysis: string;
  tags: string[];
  source: string;
  reviewCount: number;
  isMastered: boolean;
  lastReviewAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MistakeListItem {
  _id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  tags: string[];
  reviewCount: number;
  isMastered: boolean;
  hasImages: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MistakeStats {
  total: number;
  mastered: number;
  needReview: number;
  bySubject: Record<string, number>;
}

export interface AIExtractResult {
  questionContent: string;
  answerContent: string;
  analysis: string;
  suggestedTags: string[];
  suggestedSubject: Subject;
}

export interface MistakeCreateInput {
  title: string;
  subject: Subject;
  difficulty?: Difficulty;
  questionContent?: string;
  answerContent?: string;
  myAnswer?: string;
  analysis?: string;
  tags?: string[];
  source?: string;
  notes?: string;
}

export interface MistakeUpdateInput {
  title?: string;
  subject?: Subject;
  difficulty?: Difficulty;
  questionContent?: string;
  answerContent?: string;
  myAnswer?: string;
  analysis?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  isMastered?: boolean;
}

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  other: '其他',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const SUBJECT_COLORS: Record<Subject, string> = {
  math: 'bg-blue-100 text-blue-700',
  chinese: 'bg-red-100 text-red-700',
  english: 'bg-green-100 text-green-700',
  physics: 'bg-purple-100 text-purple-700',
  chemistry: 'bg-yellow-100 text-yellow-700',
  biology: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};
