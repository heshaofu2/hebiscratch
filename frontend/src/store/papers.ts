import { create } from 'zustand';
import { papersApi } from '@/lib/api';
import type { Paper, PaperListItem, PaperCreateData, PaperUpdateData } from '@/types';

interface PapersState {
  // 数据
  papers: PaperListItem[];
  currentPaper: Paper | null;

  // UI 状态
  isLoading: boolean;
  error: string | null;

  // 筛选
  searchQuery: string;
  subjectFilter: string;

  // 操作
  fetchPapers: () => Promise<void>;
  fetchPaper: (id: string) => Promise<void>;
  createPaper: (data: PaperCreateData) => Promise<PaperListItem>;
  updatePaper: (id: string, data: PaperUpdateData) => Promise<void>;
  deletePaper: (id: string) => Promise<void>;

  // 筛选设置
  setSearchQuery: (query: string) => void;
  setSubjectFilter: (subject: string) => void;
}

export const usePapersStore = create<PapersState>((set, get) => ({
  papers: [],
  currentPaper: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  subjectFilter: '',

  fetchPapers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { searchQuery, subjectFilter } = get();
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (subjectFilter) params.subject = subjectFilter;

      const papers = await papersApi.list(params);
      set({ papers, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchPaper: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const paper = await papersApi.get(id);
      set({ currentPaper: paper, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createPaper: async (data: PaperCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const paper = await papersApi.create(data);
      set((state) => ({
        papers: [paper, ...state.papers],
        isLoading: false,
      }));
      return paper;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updatePaper: async (id: string, data: PaperUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await papersApi.update(id, data);
      set((state) => ({
        papers: state.papers.map((p) =>
          p._id === id
            ? { ...p, title: updated.title, description: updated.description, subject: updated.subject, questionCount: updated.questions.length }
            : p
        ),
        currentPaper: state.currentPaper?._id === id ? updated : state.currentPaper,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  deletePaper: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await papersApi.delete(id);
      set((state) => ({
        papers: state.papers.filter((p) => p._id !== id),
        currentPaper: state.currentPaper?._id === id ? null : state.currentPaper,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSubjectFilter: (subject: string) => set({ subjectFilter: subject }),
}));
