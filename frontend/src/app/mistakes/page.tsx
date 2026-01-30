'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useMistakesStore } from '@/store/mistakes';
import { mistakesApi } from '@/lib/api';
import {
  SUBJECT_LABELS,
  SUBJECT_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  type Subject,
} from '@/types/mistake';

const SUBJECTS: (Subject | 'all')[] = ['all', 'math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'other'];

export default function MistakesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { mistakes, stats, isLoading, filter, fetchMistakes, fetchStats, setFilter, deleteMistake } = useMistakesStore();
  const [activeSubject, setActiveSubject] = useState<Subject | 'all'>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated) {
      fetchMistakes();
      fetchStats();
    }
  }, [authLoading, isAuthenticated, router, fetchMistakes, fetchStats]);

  useEffect(() => {
    fetchMistakes();
  }, [filter, fetchMistakes]);

  const handleSubjectChange = (subject: Subject | 'all') => {
    setActiveSubject(subject);
    setFilter({ ...filter, subject: subject === 'all' ? undefined : subject });
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`确定要删除错题 "${title}" 吗？此操作不可恢复。`)) {
      await deleteMistake(id);
      fetchStats();
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await mistakesApi.exportPdf({
        subject: activeSubject === 'all' ? undefined : activeSubject,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mistakes_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
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
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">错题本</h1>
          <div className="flex gap-3">
            <button
              onClick={handleExportPdf}
              disabled={exporting || mistakes.length === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? '导出中...' : '导出 PDF'}
            </button>
            <Link
              href="/mistakes/new"
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加错题
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-gray-500 mt-1">总错题数</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600">{stats.mastered}</div>
              <div className="text-gray-500 mt-1">已掌握</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-orange-500">{stats.needReview}</div>
              <div className="text-gray-500 mt-1">待复习</div>
            </div>
          </div>
        )}

        {/* 学科筛选 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              onClick={() => handleSubjectChange(subject)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                activeSubject === subject
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {subject === 'all' ? '全部' : SUBJECT_LABELS[subject]}
              {subject !== 'all' && stats?.bySubject[subject] && (
                <span className="ml-1 text-sm opacity-75">({stats.bySubject[subject]})</span>
              )}
            </button>
          ))}
        </div>

        {/* 错题列表 */}
        {mistakes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">还没有错题</h2>
            <p className="text-gray-600 mb-6">开始添加你的第一道错题吧！</p>
            <Link
              href="/mistakes/new"
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加错题
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mistakes.map((mistake) => (
              <div
                key={mistake._id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate flex-1">{mistake.title}</h3>
                    {mistake.isMastered && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        已掌握
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${SUBJECT_COLORS[mistake.subject]}`}>
                      {SUBJECT_LABELS[mistake.subject]}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${DIFFICULTY_COLORS[mistake.difficulty]}`}>
                      {DIFFICULTY_LABELS[mistake.difficulty]}
                    </span>
                    {mistake.hasImages && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                        有图片
                      </span>
                    )}
                  </div>
                  {mistake.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {mistake.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs text-gray-500">
                          #{tag}
                        </span>
                      ))}
                      {mistake.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{mistake.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>复习 {mistake.reviewCount} 次</span>
                    <span>{new Date(mistake.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
                <div className="border-t px-4 py-3 flex gap-2">
                  <Link
                    href={`/mistakes/${mistake._id}`}
                    className="flex-1 px-3 py-1.5 bg-orange-500 text-white text-sm text-center rounded-lg hover:bg-orange-600 transition"
                  >
                    查看
                  </Link>
                  <button
                    onClick={() => handleDelete(mistake._id, mistake.title)}
                    className="px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
