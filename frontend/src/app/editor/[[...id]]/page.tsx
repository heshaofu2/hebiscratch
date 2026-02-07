'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const projectId = params?.id?.[0] as string | undefined;

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { currentProject, fetchProject, updateProject, setCurrentProject } = useProjectsStore();

  const [title, setTitle] = useState('未命名项目');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [projectData, setProjectData] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // 如果没有项目 ID，重定向到项目列表页面
    if (!projectId && isAuthenticated) {
      router.replace('/projects');
      return;
    }

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
      // 使用项目 ID 来判断是否是新项目，而不是布尔标志
      if (loadedProjectIdRef.current !== currentProject._id && currentProject.projectJson) {
        const json = currentProject.projectJson as { sb3?: string };
        if (json.sb3) {
          setProjectData(json.sb3);
          loadedProjectIdRef.current = currentProject._id;
        }
      }
    }
  }, [currentProject]);

  // 处理保存 - 接收 base64 编码的 sb3 数据
  const handleSave = useCallback(async (sb3Data: string) => {
    if (isSaving || !currentProject) return;

    setIsSaving(true);
    try {
      // 存储 sb3 数据（base64 编码）
      const projectJson = { sb3: sb3Data };
      await updateProject(currentProject._id, { title, projectJson });
      setLastSaved(new Date());
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, currentProject, title, updateProject]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // projectData 已经是 sb3 data URL 格式，直接使用

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
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
