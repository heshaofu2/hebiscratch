'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareApi } from '@/lib/api';
import type { Project } from '@/types';
import dynamic from 'next/dynamic';

const ScratchPlayer = dynamic(() => import('@/components/ScratchPlayer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-400">加载播放器中...</p>
      </div>
    </div>
  ),
});

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadProject = async () => {
      try {
        const data = await shareApi.getProject(token);
        setProject(data);
      } catch {
        setError('无法加载项目，该分享链接可能已失效或不存在');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [token]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">无法加载项目</h1>
          <p className="text-gray-400 mb-6">{error || '该分享链接可能已失效或不存在'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col ${isFullscreen ? 'p-0' : ''}`}>
      {/* 顶部信息栏 */}
      {!isFullscreen && (
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-gray-400 truncate">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {project.viewCount} 次浏览
            </span>
          </div>
        </div>
      )}

      {/* 播放器区域 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl aspect-[4/3]'}`}>
          <ScratchPlayer
            projectData={(project.projectJson as { sb3?: string })?.sb3}
            isFullscreen={isFullscreen}
          />

          {/* 全屏按钮 */}
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition"
          >
            {isFullscreen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 底部信息 */}
      {!isFullscreen && (
        <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center justify-center text-gray-500 text-sm">
          由 Scratch 私有化服务提供支持
        </div>
      )}
    </div>
  );
}
