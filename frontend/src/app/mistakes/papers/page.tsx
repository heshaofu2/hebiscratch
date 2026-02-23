'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText } from 'lucide-react';
import { usePapersStore } from '@/store/papers';
import { PaperCard } from '@/components/papers/PaperCard';

export default function PapersPage() {
  const {
    papers,
    isLoading,
    searchQuery,
    fetchPapers,
    setSearchQuery,
  } = usePapersStore();

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // debounce 触发搜索
    const timer = setTimeout(() => {
      usePapersStore.getState().fetchPapers();
    }, 300);
    return () => clearTimeout(timer);
  };

  return (
    <div className="p-6">
      {/* 搜索栏 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">试卷管理</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索试卷..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      {/* 试卷列表 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg mb-2">还没有试卷</p>
          <p className="text-sm mb-6">从题库中选择题目，组成你的第一份试卷</p>
          <Link
            href="/mistakes/papers/new"
            className="px-6 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-sm font-medium"
          >
            创建试卷
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((paper) => (
            <PaperCard key={paper._id} paper={paper} />
          ))}
        </div>
      )}

      {/* 浮动创建按钮 */}
      {papers.length > 0 && (
        <Link
          href="/mistakes/papers/new"
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-600 transition hover:scale-105"
          title="创建试卷"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}
