'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useMistakesStore } from '@/store/mistakes';
import { MistakeCard } from '@/components/mistakes/MistakeCard';
import { MistakeStats } from '@/components/mistakes/MistakeStats';
import { SubjectSelect } from '@/components/mistakes/SubjectSelect';

export default function MistakesPage() {
  const {
    mistakes,
    stats,
    isLoading,
    subjectFilter,
    masteredFilter,
    searchQuery,
    fetchMistakes,
    fetchStats,
    setSubjectFilter,
    setMasteredFilter,
    setSearchQuery,
  } = useMistakesStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchMistakes();
  }, [fetchMistakes, subjectFilter, masteredFilter, searchQuery]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 统计概览 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">错题本</h1>
          <MistakeStats stats={stats} />
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <SubjectSelect
            value={subjectFilter}
            onChange={(v) => setSubjectFilter(v)}
            includeAll
          />

          <select
            value={masteredFilter}
            onChange={(e) => setMasteredFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">全部状态</option>
            <option value="false">未掌握</option>
            <option value="true">已掌握</option>
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索题目..."
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 错题列表 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : mistakes.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 mb-4">还没有错题记录</p>
            <Link
              href="/mistakes/new"
              className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              添加第一道错题
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mistakes.map((m) => (
              <MistakeCard key={m._id} mistake={m} />
            ))}
          </div>
        )}

        {/* 浮动添加按钮 */}
        <Link
          href="/mistakes/new"
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition hover:scale-105"
          title="添加错题"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
