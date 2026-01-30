import { create } from 'zustand';
import { mistakesApi } from '@/lib/api';
import type {
  MistakeQuestion,
  MistakeListItem,
  MistakeStats,
  MistakeCreateInput,
  MistakeUpdateInput,
  Subject,
} from '@/types/mistake';

interface MistakesState {
  mistakes: MistakeListItem[];
  currentMistake: MistakeQuestion | null;
  stats: MistakeStats | null;
  isLoading: boolean;
  error: string | null;
  filter: {
    subject?: Subject;
    tag?: string;
    isMastered?: boolean;
  };

  fetchMistakes: () => Promise<void>;
  fetchMistake: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createMistake: (data: MistakeCreateInput) => Promise<MistakeQuestion>;
  updateMistake: (id: string, data: MistakeUpdateInput) => Promise<void>;
  deleteMistake: (id: string) => Promise<void>;
  uploadImage: (id: string, file: File) => Promise<MistakeQuestion>;
  markReviewed: (id: string) => Promise<void>;
  setFilter: (filter: MistakesState['filter']) => void;
  setCurrentMistake: (mistake: MistakeQuestion | null) => void;
}

export const useMistakesStore = create<MistakesState>((set, get) => ({
  mistakes: [],
  currentMistake: null,
  stats: null,
  isLoading: false,
  error: null,
  filter: {},

  fetchMistakes: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      const mistakes = await mistakesApi.list(filter);
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
      console.error('Failed to fetch stats:', err);
    }
  },

  createMistake: async (data: MistakeCreateInput) => {
    set({ isLoading: true, error: null });
    try {
      const mistake = await mistakesApi.create(data);
      set((state) => ({
        mistakes: [
          {
            _id: mistake._id,
            title: mistake.title,
            subject: mistake.subject,
            difficulty: mistake.difficulty,
            tags: mistake.tags,
            reviewCount: mistake.reviewCount,
            isMastered: mistake.isMastered,
            hasImages: mistake.imagePaths.length > 0,
            createdAt: mistake.createdAt,
            updatedAt: mistake.updatedAt,
          },
          ...state.mistakes,
        ],
        currentMistake: mistake,
        isLoading: false,
      }));
      return mistake;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateMistake: async (id: string, data: MistakeUpdateInput) => {
    set({ isLoading: true, error: null });
    try {
      const mistake = await mistakesApi.update(id, data);
      set((state) => ({
        mistakes: state.mistakes.map((m) =>
          m._id === id
            ? {
                ...m,
                title: mistake.title,
                subject: mistake.subject,
                difficulty: mistake.difficulty,
                tags: mistake.tags,
                isMastered: mistake.isMastered,
                updatedAt: mistake.updatedAt,
              }
            : m
        ),
        currentMistake: state.currentMistake?._id === id ? mistake : state.currentMistake,
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

  uploadImage: async (id: string, file: File) => {
    set({ isLoading: true, error: null });
    try {
      const mistake = await mistakesApi.uploadImage(id, file);
      set((state) => ({
        mistakes: state.mistakes.map((m) =>
          m._id === id ? { ...m, hasImages: true, updatedAt: mistake.updatedAt } : m
        ),
        currentMistake: state.currentMistake?._id === id ? mistake : state.currentMistake,
        isLoading: false,
      }));
      return mistake;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  markReviewed: async (id: string) => {
    try {
      const mistake = await mistakesApi.markReviewed(id);
      set((state) => ({
        mistakes: state.mistakes.map((m) =>
          m._id === id ? { ...m, reviewCount: mistake.reviewCount, updatedAt: mistake.updatedAt } : m
        ),
        currentMistake: state.currentMistake?._id === id ? mistake : state.currentMistake,
      }));
    } catch (err) {
      console.error('Failed to mark reviewed:', err);
      throw err;
    }
  },

  setFilter: (filter: MistakesState['filter']) => {
    set({ filter });
  },

  setCurrentMistake: (mistake: MistakeQuestion | null) => {
    set({ currentMistake: mistake });
  },
}));
