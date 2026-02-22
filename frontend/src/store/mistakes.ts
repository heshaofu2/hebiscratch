import { create } from 'zustand';
import { mistakesApi } from '@/lib/api';
import type {
  MistakeEntry,
  MistakeListItem,
  MistakeCreateData,
  MistakeUpdateData,
  MistakeBatchCreateData,
  ImageRecognitionResult,
  MistakeStats,
} from '@/types';

interface MistakesState {
  // 数据
  mistakes: MistakeListItem[];
  currentMistake: MistakeEntry | null;
  stats: MistakeStats | null;
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
  fetchMistakes: () => Promise<void>;
  fetchMistake: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createMistake: (data: MistakeCreateData) => Promise<MistakeEntry>;
  createBatch: (data: MistakeBatchCreateData) => Promise<MistakeEntry[]>;
  updateMistake: (id: string, data: MistakeUpdateData) => Promise<void>;
  deleteMistake: (id: string) => Promise<void>;
  reviewMistake: (id: string) => Promise<void>;
  recognizeImage: (file: File) => Promise<ImageRecognitionResult>;
  clearRecognitionResult: () => void;

  // 多选操作
  toggleSelectMode: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  batchDelete: (ids: string[]) => Promise<void>;
  batchUpdateMastered: (ids: string[], isMastered: boolean) => Promise<void>;

  // 筛选设置
  setSubjectFilter: (subjects: string[]) => void;
  setMasteredFilter: (mastered: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useMistakesStore = create<MistakesState>((set, get) => ({
  mistakes: [],
  currentMistake: null,
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

  fetchMistakes: async () => {
    set({ isLoading: true, error: null });
    try {
      const { subjectFilter, masteredFilter, searchQuery } = get();
      const params: Record<string, string[] | boolean | string> = {};
      if (subjectFilter.length > 0) params.subject = subjectFilter;
      if (masteredFilter !== 'all') params.mastered = masteredFilter === 'true';
      if (searchQuery) params.search = searchQuery;

      const mistakes = await mistakesApi.list(params);
      set({ mistakes, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchMistake: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const mistake = await mistakesApi.get(id);
      set({ currentMistake: mistake, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await mistakesApi.getStats();
      set({ stats });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createMistake: async (data: MistakeCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const mistake = await mistakesApi.create(data);
      set((state) => ({
        mistakes: [{ ...mistake, question: mistake.question.slice(0, 100) }, ...state.mistakes],
        isLoading: false,
      }));
      return mistake;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  createBatch: async (data: MistakeBatchCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const mistakes = await mistakesApi.createBatch(data);
      set({ isLoading: false });
      return mistakes;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateMistake: async (id: string, data: MistakeUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await mistakesApi.update(id, data);
      set((state) => ({
        mistakes: state.mistakes.map((m) => (m._id === id ? { ...m, ...updated } : m)),
        currentMistake: state.currentMistake?._id === id ? updated : state.currentMistake,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  deleteMistake: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await mistakesApi.delete(id);
      set((state) => ({
        mistakes: state.mistakes.filter((m) => m._id !== id),
        currentMistake: state.currentMistake?._id === id ? null : state.currentMistake,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  reviewMistake: async (id: string) => {
    try {
      const updated = await mistakesApi.review(id);
      set((state) => ({
        mistakes: state.mistakes.map((m) =>
          m._id === id ? { ...m, reviewCount: updated.reviewCount } : m
        ),
        currentMistake: state.currentMistake?._id === id ? updated : state.currentMistake,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  recognizeImage: async (file: File) => {
    set({ isRecognizing: true, error: null });
    try {
      const result = await mistakesApi.recognizeImage(file);
      set({ recognitionResult: result, isRecognizing: false });
      return result;
    } catch (err) {
      set({ error: (err as Error).message, isRecognizing: false });
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
      selectedIds: new Set(state.mistakes.map((m) => m._id)),
    }));
  },

  deselectAll: () => {
    set({ selectedIds: new Set() });
  },

  batchDelete: async (ids: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await mistakesApi.batchDelete(ids);
      const idSet = new Set(ids);
      set((state) => ({
        mistakes: state.mistakes.filter((m) => !idSet.has(m._id)),
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
      await mistakesApi.batchUpdate(ids, { isMastered });
      const idSet = new Set(ids);
      set((state) => ({
        mistakes: state.mistakes.map((m) =>
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
