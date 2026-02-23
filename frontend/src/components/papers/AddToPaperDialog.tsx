'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Plus, Loader2 } from 'lucide-react';
import { papersApi } from '@/lib/api';
import type { PaperListItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AddToPaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionIds: string[];
  onSuccess: () => void;
}

export function AddToPaperDialog({
  open,
  onOpenChange,
  questionIds,
  onSuccess,
}: AddToPaperDialogProps) {
  const router = useRouter();
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await papersApi.list({ search: search || undefined });
      setPapers(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (open) {
      setFeedback('');
      setAddingId(null);
      loadPapers();
    }
  }, [open, loadPapers]);

  const handleAdd = async (paper: PaperListItem) => {
    setAddingId(paper._id);
    setFeedback('');
    try {
      const result = await papersApi.addQuestions(paper._id, questionIds);
      setFeedback(
        result.added > 0
          ? `已添加 ${result.added} 道题到「${paper.title}」`
          : `所选题目已存在于「${paper.title}」中`
      );
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 1200);
    } catch {
      setFeedback('添加失败，请重试');
    } finally {
      setAddingId(null);
    }
  };

  const handleCreateNew = () => {
    onOpenChange(false);
    router.push(`/mistakes/papers/new?questions=${questionIds.join(',')}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加到试卷</DialogTitle>
          <DialogDescription>
            将选中的 {questionIds.length} 道题添加到已有试卷，或创建新试卷
          </DialogDescription>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索试卷..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 试卷列表 */}
        <div className="max-h-64 overflow-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              加载中...
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? '未找到匹配的试卷' : '暂无试卷'}
            </div>
          ) : (
            <div className="space-y-2">
              {papers.map((paper) => (
                <div
                  key={paper._id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition"
                >
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {paper.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {paper.subject && (
                        <span className="mr-2">{paper.subject}</span>
                      )}
                      {paper.questionCount} 道题
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(paper)}
                    disabled={addingId !== null}
                    className="shrink-0 px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingId === paper._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      '添加'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 反馈信息 */}
        {feedback && (
          <p className={`text-sm text-center ${feedback.includes('失败') ? 'text-red-500' : 'text-green-600'}`}>
            {feedback}
          </p>
        )}

        {/* 创建新试卷 */}
        <button
          onClick={handleCreateNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 transition"
        >
          <Plus className="w-4 h-4" />
          创建新试卷
        </button>
      </DialogContent>
    </Dialog>
  );
}
