'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
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
  const { currentProject, fetchProject, createProject, updateProject, setCurrentProject } = useProjectsStore();

  const [title, setTitle] = useState('未命名项目');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [projectData, setProjectData] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (projectId && isAuthenticated) {
      fetchProject(projectId);
    } else {
      setCurrentProject(null);
    }

    return () => {
      setCurrentProject(null);
    };
  }, [authLoading, isAuthenticated, projectId, router, fetchProject, setCurrentProject]);

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title);
      // 如果项目有 sb3 数据（base64），直接使用
      // 否则尝试将 projectJson 转换为字符串
      if (currentProject.projectJson) {
        if (typeof currentProject.projectJson === 'string') {
          setProjectData(currentProject.projectJson);
        } else {
          // 将 JSON 对象转换为字符串
          setProjectData(JSON.stringify(currentProject.projectJson));
        }
      }
    }
  }, [currentProject]);

  // 处理保存 - 接收 base64 编码的 sb3 数据
  const handleSave = useCallback(async (sb3Data: string) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      // 存储 sb3 数据（base64 编码）
      const projectJson = { sb3: sb3Data };

      if (currentProject) {
        await updateProject(currentProject._id, { title, projectJson });
      } else {
        const newProject = await createProject({ title, projectJson });
        router.replace(`/editor/${newProject._id}`);
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, currentProject, title, updateProject, createProject, router]);

  if (authLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // 准备传递给编辑器的数据
  const editorProjectData = projectData
    ? (currentProject?.projectJson as { sb3?: string })?.sb3 || projectData
    : undefined;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      {/* 工具栏 */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="项目名称"
        />
        <button
          onClick={() => {
            // 触发保存，编辑器会响应这个事件并返回数据
            const event = new CustomEvent('scratch-save-request');
            window.dispatchEvent(event);
          }}
          disabled={isSaving}
          className="px-4 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        {lastSaved && (
          <span className="text-sm text-gray-500">
            上次保存: {lastSaved.toLocaleTimeString('zh-CN')}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => router.push('/projects')}
          className="px-4 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          返回
        </button>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <ScratchEditor
          projectData={editorProjectData}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
