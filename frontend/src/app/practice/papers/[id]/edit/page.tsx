'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, X } from 'lucide-react';
import { questionsApi, papersApi } from '@/lib/api';
import { usePapersStore } from '@/store/papers';
import { QuestionPickerDialog } from '@/components/papers/QuestionPickerDialog';
import type { QuestionListItem, Paper } from '@/types';
import { SUBJECTS } from '@/types';

export default function EditPaperPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { updatePaper } = usePapersStore();

  // 初始加载
  const [loading, setLoading] = useState(true);

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');

  // 已选题目
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 完整题库（用于通过 ID 查找题目信息）
  const [allQuestions, setAllQuestions] = useState<QuestionListItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // 加载试卷详情
  useEffect(() => {
    (async () => {
      try {
        const paper: Paper = await papersApi.get(id);
        setTitle(paper.title);
        setDescription(paper.description);
        setSubject(paper.subject || '');
        setSelectedIds(paper.questions.map((q) => q._id));
      } catch {
        router.push('/practice/papers');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  // 加载完整题库（不带筛选）
  const loadAllQuestions = useCallback(async () => {
    try {
      const list = await questionsApi.list();
      setAllQuestions(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAllQuestions();
  }, [loadAllQuestions]);

  const removeQuestion = (qid: string) => {
    setSelectedIds((prev) => prev.filter((i) => i !== qid));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updatePaper(id, {
        title: title.trim(),
        description: description.trim(),
        subject: subject || undefined,
        questions: selectedIds,
      });
      router.push(`/practice/papers/${id}`);
    } catch {
      // store 已处理 error
    } finally {
      setSaving(false);
    }
  };

  const getQuestionById = (qid: string) => allQuestions.find((q) => q._id === qid);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* 顶部表单 */}
      <div className="bg-white border-b border-gray-200 p-4 shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">编辑试卷</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="试卷标题 *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="备注（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          >
            <option value="">科目（可选）</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 题目列表区 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            题目列表 <span className="text-indigo-500">({selectedIds.length})</span>
          </h3>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            添加题目
          </button>
        </div>

        {selectedIds.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">点击上方「添加题目」从题库中选题</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedIds.map((qid, index) => {
              const q = getQuestionById(qid);
              return (
                <div
                  key={qid}
                  className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-100 text-sm"
                >
                  <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {q ? (
                      <>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {q.subject}
                        </span>
                        <p className="text-gray-700 line-clamp-2 mt-1">{q.question}</p>
                      </>
                    ) : (
                      <p className="text-gray-400">题目 ID: {qid}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col gap-0.5">
                    <button
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === selectedIds.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeQuestion(qid)}
                      className="p-0.5 text-red-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <div className="p-4 border-t border-gray-200 bg-white shrink-0">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : `保存修改（${selectedIds.length} 道题）`}
        </button>
      </div>

      {/* 添加题目 Dialog */}
      <QuestionPickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        existingIds={selectedIds}
        onConfirm={(newIds) => {
          setSelectedIds((prev) => [...prev, ...newIds]);
        }}
      />
    </div>
  );
}
