import { create } from 'zustand';
import { questionsApi } from '@/lib/api';
import type {
  QuestionEntry,
  QuestionListItem,
  QuestionCreateData,
  QuestionUpdateData,
  QuestionBatchCreateData,
  ImageRecognitionResult,
  QuestionStats,
} from '@/types';

interface QuestionsState {
  // 数据
  questions: QuestionListItem[];
  currentQuestion: QuestionEntry | null;
  stats: QuestionStats | null;
  recognitionResult: ImageRecognitionResult | null;

  // UI 状态
  isLoading: boolean;
  isRecognizing: boolean;
  error: string | null;

  // 多选状态
  selectedIds: Set<string>;
  isSelectMode: boolean;

  // 筛选
  subjectFilter: string[];
  masteredFilter: string; // 'all' | 'true' | 'false'
  searchQuery: string;

  // 操作
  fetchQuestions: () => Promise<void>;
  fetchQuestion: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createQuestion: (data: QuestionCreateData) => Promise<QuestionEntry>;
  createBatch: (data: QuestionBatchCreateData) => Promise<QuestionEntry[]>;
  updateQuestion: (id: string, data: QuestionUpdateData) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  reviewQuestion: (id: string) => Promise<void>;
  recognizeImage: (file: File) => Promise<ImageRecognitionResult>;
  clearRecognitionResult: () => void;

  // 多选操作
  toggleSelectMode: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  selectAllFromList: (ids: string[]) => void;
  deselectAll: () => void;
  batchDelete: (ids: string[]) => Promise<void>;
  batchUpdateMastered: (ids: string[], isMastered: boolean) => Promise<void>;

  // 筛选设置
  setSubjectFilter: (subjects: string[]) => void;
  setMasteredFilter: (mastered: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useQuestionsStore = create<QuestionsState>((set, get) => ({
  questions: [],
  currentQuestion: null,
  stats: null,
  recognitionResult: null,
  isLoading: false,
  isRecognizing: false,
  error: null,
  selectedIds: new Set(),
  isSelectMode: false,
  subjectFilter: [],
  masteredFilter: 'all',
  searchQuery: '',

  fetchQuestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { subjectFilter, masteredFilter, searchQuery } = get();
      const params: Record<string, string[] | boolean | string> = {};
      if (subjectFilter.length > 0) params.subject = subjectFilter;
      if (masteredFilter !== 'all') params.mastered = masteredFilter === 'true';
      if (searchQuery) params.search = searchQuery;

      const questions = await questionsApi.list(params);
      set({ questions, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchQuestion: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const question = await questionsApi.get(id);
      set({ currentQuestion: question, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await questionsApi.getStats();
      set({ stats });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createQuestion: async (data: QuestionCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const question = await questionsApi.create(data);
      set((state) => ({
        questions: [{ ...question, question: question.question.slice(0, 100) }, ...state.questions],
        isLoading: false,
      }));
      return question;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  createBatch: async (data: QuestionBatchCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const questions = await questionsApi.createBatch(data);
      set({ isLoading: false });
      return questions;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateQuestion: async (id: string, data: QuestionUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await questionsApi.update(id, data);
      set((state) => ({
        questions: state.questions.map((m) => (m._id === id ? { ...m, ...updated } : m)),
        currentQuestion: state.currentQuestion?._id === id ? updated : state.currentQuestion,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  deleteQuestion: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await questionsApi.delete(id);
      set((state) => ({
        questions: state.questions.filter((m) => m._id !== id),
        currentQuestion: state.currentQuestion?._id === id ? null : state.currentQuestion,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  reviewQuestion: async (id: string) => {
    try {
      const updated = await questionsApi.review(id);
      set((state) => ({
        questions: state.questions.map((m) =>
          m._id === id ? { ...m, reviewCount: updated.reviewCount } : m
        ),
        currentQuestion: state.currentQuestion?._id === id ? updated : state.currentQuestion,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  recognizeImage: async (file: File) => {
    set({ isRecognizing: true, error: null });
    try {
      const result = await questionsApi.recognizeImage(file);
      set({ recognitionResult: result, isRecognizing: false });
      return result;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const message =
        axiosErr.response?.status === 429
          ? axiosErr.response.data?.detail || '已达到图片识别上限，请联系管理员提升额度'
          : (err as Error).message;
      set({ error: message, isRecognizing: false });
      throw err;
    }
  },

  clearRecognitionResult: () => set({ recognitionResult: null }),

  // ── 多选操作 ──────────────────────────────────
  toggleSelectMode: () => {
    set((state) => ({
      isSelectMode: !state.isSelectMode,
      selectedIds: new Set(),
    }));
  },

  toggleSelect: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.questions.map((m) => m._id)),
    }));
  },

  selectAllFromList: (ids: string[]) => {
    set({ selectedIds: new Set(ids) });
  },

  deselectAll: () => {
    set({ selectedIds: new Set() });
  },

  batchDelete: async (ids: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await questionsApi.batchDelete(ids);
      const idSet = new Set(ids);
      set((state) => ({
        questions: state.questions.filter((m) => !idSet.has(m._id)),
        isLoading: false,
        isSelectMode: false,
        selectedIds: new Set(),
      }));
      get().fetchStats();
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  batchUpdateMastered: async (ids: string[], isMastered: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await questionsApi.batchUpdate(ids, { isMastered });
      const idSet = new Set(ids);
      set((state) => ({
        questions: state.questions.map((m) =>
          idSet.has(m._id) ? { ...m, isMastered } : m
        ),
        isLoading: false,
        isSelectMode: false,
        selectedIds: new Set(),
      }));
      get().fetchStats();
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  setSubjectFilter: (subjects: string[]) => set({ subjectFilter: subjects }),
  setMasteredFilter: (mastered: string) => set({ masteredFilter: mastered }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
