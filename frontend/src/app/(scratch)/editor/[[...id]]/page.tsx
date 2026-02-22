'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

// 动态导入 Scratch 编辑器，禁用 SSR
const ScratchEditor = dynamic(() => import('@/components/ScratchEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">加载编辑器中...</p>
      </div>
    </div>
  ),
});

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.id?.[0] as string | undefined;

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    currentProject,
    fetchProject,
    createProject,
    updateProject,
    setCurrentProject,
    error: projectError,
  } = useProjectsStore();

  // 新建模式：从 URL 参数获取标题；编辑模式：从项目数据获取标题
  const initialTitle = searchParams?.get('title') || '未命名项目';
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [projectData, setProjectData] = useState<string | undefined>(undefined);

  // 跟踪当前项目 ID（新建项目首次保存后会从 undefined 变为实际 ID）
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // 仅编辑模式（有 projectId）才需要加载项目
    if (projectId && isAuthenticated) {
      fetchProject(projectId);
    }

    return () => {
      setCurrentProject(null);
    };
  }, [authLoading, isAuthenticated, projectId, router, fetchProject, setCurrentProject]);

  // 用于跟踪是否是首次加载项目，使用 ref 配合项目 ID 来正确追踪
  const loadedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title);
      // 只在首次加载该项目时设置项目数据，保存后不重新加载（编辑器状态已是最新）
      if (loadedProjectIdRef.current !== currentProject._id && currentProject.projectJson) {
        const json = currentProject.projectJson as { sb3?: string };
        if (json.sb3) {
          setProjectData(json.sb3);
          loadedProjectIdRef.current = currentProject._id;
        }
      }
    }
  }, [currentProject]);

  // 处理保存 — 首次保存时创建项目，后续保存时更新
  const handleSave = useCallback(async (sb3Data: string) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const projectJson = { sb3: sb3Data };
      if (currentProjectId) {
        // 已有项目 → 更新
        await updateProject(currentProjectId, { title, projectJson });
      } else {
        // 新项目 → 首次保存时创建 DB 记录
        const newProject = await createProject({ title, projectJson });
        setCurrentProjectId(newProject._id);
        // 更新 URL（不刷新页面），后续保存走更新逻辑
        window.history.replaceState(null, '', `/editor/${newProject._id}`);
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, currentProjectId, title, createProject, updateProject]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // 编辑模式下：项目加载失败时显示错误提示
  if (projectId && projectError && !currentProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-lg">项目加载失败</p>
          <p className="text-gray-500 text-sm">{projectError}</p>
          <Button onClick={() => router.push('/projects')} variant="secondary">
            返回项目列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 工具栏 */}
      <div className="h-12 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-48 text-foreground"
          placeholder="项目名称"
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('scratch-save-request');
            window.dispatchEvent(event);
          }}
          disabled={isSaving}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
        {lastSaved && (
          <span className="text-sm text-muted-foreground">
            上次保存: {lastSaved.toLocaleTimeString('zh-CN')}
          </span>
        )}
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={() => router.push('/projects')}
        >
          返回
        </Button>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <ScratchEditor
          projectData={projectData}
          mode={projectId ? 'edit' : 'new'}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
