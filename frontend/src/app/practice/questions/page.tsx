'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useQuestionsStore } from '@/store/questions';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { QuestionStats } from '@/components/questions/QuestionStats';
import { QuestionBrowser } from '@/components/questions/QuestionBrowser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AddToPaperDialog } from '@/components/papers/AddToPaperDialog';
import type { QuestionListItem } from '@/types';

export default function QuestionsPage() {
  const {
    stats,
    isSelectMode,
    selectedIds,
    fetchStats,
    toggleSelectMode,
    toggleSelect,
    selectAllFromList,
    deselectAll,
    batchDelete,
    batchUpdateMastered,
  } = useQuestionsStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddToPaperDialog, setShowAddToPaperDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 当前可见的题目列表（用于全选操作）
  const currentQuestionsRef = useRef<QuestionListItem[]>([]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  const handleBatchDelete = async () => {
    setShowDeleteDialog(false);
    await batchDelete(selectedArray);
    setRefreshKey(Date.now());
  };

  const handleBatchMastered = async (isMastered: boolean) => {
    await batchUpdateMastered(selectedArray, isMastered);
    setRefreshKey(Date.now());
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 统计概览 */}
        <div className="mb-8">
          <QuestionStats stats={stats} />
        </div>

        {/* 题库浏览器 */}
        <QuestionBrowser
          showMasteredFilter
          refreshKey={refreshKey}
          onDataLoaded={(list) => { currentQuestionsRef.current = list; }}
          toolbarLeft={
            <>
              <button
                onClick={toggleSelectMode}
                className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  isSelectMode
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isSelectMode ? '取消' : '批量操作'}
              </button>
              <Link
                href="/practice/questions/new"
                className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                添加题目
              </Link>
            </>
          }
          listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          renderItem={(q) => (
            <QuestionCard
              key={q._id}
              question={q}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(q._id)}
              onToggleSelect={toggleSelect}
            />
          )}
          renderLoading={() => (
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
          )}
          renderEmpty={() => (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mb-4">还没有错题记录</p>
              <Link
                href="/practice/questions/new"
                className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                添加第一道错题
              </Link>
            </div>
          )}
        />

        {/* 浮动添加按钮 */}
        {!isSelectMode && (
          <Link
            href="/practice/questions/new"
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
              onClick={() => {
                const currentIds = currentQuestionsRef.current.map((q) => q._id);
                if (selectedCount === currentIds.length) {
                  deselectAll();
                } else {
                  selectAllFromList(currentIds);
                }
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              {selectedCount === currentQuestionsRef.current.length ? '取消全选' : '全选'}
            </button>

            <span className="text-sm text-gray-400">|</span>

            <span className="text-sm text-gray-500 tabular-nums">
              已选 <span className="font-semibold text-indigo-600">{selectedCount}</span> 项
            </span>

            <span className="text-sm text-gray-400">|</span>

            <button
              onClick={() => handleBatchMastered(true)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              标记已掌握
            </button>

            <button
              onClick={() => handleBatchMastered(false)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              标记未掌握
            </button>

            <button
              onClick={() => setShowAddToPaperDialog(true)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              添加到试卷
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

      {/* 添加到试卷对话框 */}
      <AddToPaperDialog
        open={showAddToPaperDialog}
        onOpenChange={setShowAddToPaperDialog}
        questionIds={selectedArray}
        onSuccess={() => toggleSelectMode()}
      />
    </div>
  );
}
