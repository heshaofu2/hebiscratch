import { create } from 'zustand';
import { projectsApi } from '@/lib/api';
import type { Project } from '@/types';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: { title: string; description?: string; projectJson: Record<string, unknown> }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  shareProject: (id: string) => Promise<{ shareToken: string; shareUrl: string }>;
  unshareProject: (id: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectsApi.list();
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsApi.get(id);
      set({ currentProject: project, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsApi.create(data);
      set((state) => ({
        projects: [project, ...state.projects],
        currentProject: project,
        isLoading: false,
      }));
      return project;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsApi.update(id, data);
      set((state) => ({
        projects: state.projects.map((p) => (p._id === id ? project : p)),
        currentProject: state.currentProject?._id === id ? project : state.currentProject,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await projectsApi.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id),
        currentProject: state.currentProject?._id === id ? null : state.currentProject,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

  shareProject: async (id: string) => {
    const result = await projectsApi.share(id);
    const { projects, currentProject } = get();

    set({
      projects: projects.map((p) =>
        p._id === id ? { ...p, isPublic: true, shareToken: result.shareToken } : p
      ),
      currentProject:
        currentProject?._id === id
          ? { ...currentProject, isPublic: true, shareToken: result.shareToken }
          : currentProject,
    });

    return result;
  },

  unshareProject: async (id: string) => {
    await projectsApi.unshare(id);
    const { projects, currentProject } = get();

    set({
      projects: projects.map((p) =>
        p._id === id ? { ...p, isPublic: false, shareToken: undefined } : p
      ),
      currentProject:
        currentProject?._id === id
          ? { ...currentProject, isPublic: false, shareToken: undefined }
          : currentProject,
    });
  },
}));
