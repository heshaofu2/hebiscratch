'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMistakesStore } from '@/store/mistakes';
import { MistakeCard } from '@/components/mistakes/MistakeCard';
import { MistakeStats } from '@/components/mistakes/MistakeStats';
import { SubjectSelect } from '@/components/mistakes/SubjectSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function MistakesPage() {
  const {
    mistakes,
    stats,
    isLoading,
    subjectFilter,
    masteredFilter,
    searchQuery,
    isSelectMode,
    selectedIds,
    fetchMistakes,
    fetchStats,
    setSubjectFilter,
    setMasteredFilter,
    setSearchQuery,
    toggleSelectMode,
    toggleSelect,
    selectAll,
    deselectAll,
    batchDelete,
    batchUpdateMastered,
  } = useMistakesStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchMistakes();
  }, [fetchMistakes, subjectFilter, masteredFilter, searchQuery]);

  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  const handleBatchDelete = async () => {
    setShowDeleteDialog(false);
    await batchDelete(selectedArray);
  };

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

          <button
            onClick={toggleSelectMode}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              isSelectMode
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isSelectMode ? '取消' : '选择'}
          </button>
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
              <MistakeCard
                key={m._id}
                mistake={m}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(m._id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {/* 浮动添加按钮 */}
        {!isSelectMode && (
          <Link
            href="/mistakes/new"
            className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition hover:scale-105"
            title="添加错题"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        )}

        {/* 多选操作工具栏 */}
        {isSelectMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3">
            <button
              onClick={selectedCount === mistakes.length ? deselectAll : selectAll}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              {selectedCount === mistakes.length ? '取消全选' : '全选'}
            </button>

            <span className="text-sm text-gray-400">|</span>

            <span className="text-sm text-gray-500 tabular-nums">
              已选 <span className="font-semibold text-indigo-600">{selectedCount}</span> 项
            </span>

            <span className="text-sm text-gray-400">|</span>

            <button
              onClick={() => batchUpdateMastered(selectedArray, true)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              标记已掌握
            </button>

            <button
              onClick={() => batchUpdateMastered(selectedArray, false)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              标记未掌握
            </button>

            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              删除
            </button>

            <span className="text-sm text-gray-400">|</span>

            <button
              onClick={toggleSelectMode}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* 批量删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedCount} 道错题吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              确认删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
