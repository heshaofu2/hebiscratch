'use client';

import { useState, useMemo } from 'react';
import { QuestionBrowser } from '@/components/questions/QuestionBrowser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface QuestionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 已在试卷中的题目 ID（显示为「已添加」不可取消） */
  existingIds: string[];
  /** 确认后回调，返回本次新勾选的题目 ID */
  onConfirm: (newIds: string[]) => void;
}

export function QuestionPickerDialog({
  open,
  onOpenChange,
  existingIds,
  onConfirm,
}: QuestionPickerDialogProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(checkedIds));
    setCheckedIds(new Set());
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCheckedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>添加题目</DialogTitle>
          <DialogDescription>
            从题库中选择题目添加到试卷
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          <QuestionBrowser
            showMasteredFilter
            renderItem={(m) => {
              const isExisting = existingSet.has(m._id);
              const isChecked = checkedIds.has(m._id);
              return (
                <div
                  key={m._id}
                  onClick={() => !isExisting && toggleCheck(m._id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition cursor-pointer ${
                    isExisting
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isChecked
                        ? 'border-indigo-200 bg-indigo-50/50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`shrink-0 w-4.5 h-4.5 rounded border flex items-center justify-center ${
                    isExisting
                      ? 'border-gray-300 bg-gray-200'
                      : isChecked
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                  }`}>
                    {(isExisting || isChecked) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {m.subject}
                      </span>
                      {m.source === 'image' && (
                        <span className="text-xs text-gray-400">📷</span>
                      )}
                    </div>
                    <p className="text-gray-700 line-clamp-2">{m.question}</p>
                  </div>

                  {/* 已添加标识 */}
                  {isExisting && (
                    <span className="shrink-0 text-xs text-gray-400">已添加</span>
                  )}
                </div>
              );
            }}
          />
        </div>

        <DialogFooter className="mt-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={checkedIds.size === 0}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认添加{checkedIds.size > 0 ? ` (${checkedIds.size} 道题)` : ''}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
