'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useProjectsStore } from '@/store/projects';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { projects, isLoading, fetchProjects, deleteProject, shareProject, unshareProject } = useProjectsStore();
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [authLoading, isAuthenticated, router, fetchProjects]);

  const handleDelete = async (project: Project) => {
    if (confirm(`确定要删除项目 "${project.title}" 吗？此操作不可恢复。`)) {
      await deleteProject(project._id);
    }
  };

  const handleShare = async (project: Project) => {
    setSharingId(project._id);
    try {
      if (project.isPublic) {
        await unshareProject(project._id);
        setShareUrl(null);
      } else {
        const result = await shareProject(project._id);
        setShareUrl(result.shareUrl);
      }
    } finally {
      setSharingId(null);
    }
  };

  const copyShareUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('分享链接已复制到剪贴板');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">我的作品</h1>
          <Link
            href="/editor"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建项目
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">还没有作品</h2>
            <p className="text-gray-600 mb-6">开始创建你的第一个 Scratch 项目吧！</p>
            <Link
              href="/editor"
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建项目
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="aspect-video bg-gray-100 relative">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {project.isPublic && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      已分享
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/editor/${project._id}`}
                      className="flex-1 px-3 py-2 bg-orange-500 text-white text-sm text-center rounded-lg hover:bg-orange-600 transition"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleShare(project)}
                      disabled={sharingId === project._id}
                      className={`px-3 py-2 text-sm rounded-lg transition ${
                        project.isPublic
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      } disabled:opacity-50`}
                    >
                      {sharingId === project._id ? '...' : project.isPublic ? '取消分享' : '分享'}
                    </button>
                    <button
                      onClick={() => handleDelete(project)}
                      className="px-3 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition"
                    >
                      删除
                    </button>
                  </div>
                  {project.isPublic && project.shareToken && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${project.shareToken}`}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 rounded border border-gray-200 text-gray-600"
                      />
                      <button
                        onClick={() => copyShareUrl(`${window.location.origin}/share/${project.shareToken}`)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition"
                      >
                        复制
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {shareUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShareUrl(null)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">分享链接已生成</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => copyShareUrl(shareUrl)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  复制
                </button>
              </div>
              <button
                onClick={() => setShareUrl(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
