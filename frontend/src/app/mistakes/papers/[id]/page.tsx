'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Trash2, Edit3 } from 'lucide-react';
import { usePapersStore } from '@/store/papers';

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentPaper, isLoading, fetchPaper, deletePaper } = usePapersStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchPaper(id);
  }, [id, fetchPaper]);

  const handleDelete = async () => {
    try {
      await deletePaper(id);
      router.push('/mistakes/papers');
    } catch {
      // store 已处理 error
    }
  };

  if (isLoading || !currentPaper) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/mistakes/papers')}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{currentPaper.title}</h1>
            {currentPaper.description && (
              <p className="text-sm text-gray-500 mt-1">{currentPaper.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/mistakes/papers/${id}/print`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-700"
          >
            <Printer className="w-4 h-4" />
            打印/导出
          </Link>
          <Link
            href={`/mistakes/papers/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-700"
          >
            <Edit3 className="w-4 h-4" />
            编辑
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-red-200 rounded-lg hover:bg-red-50 transition text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      </div>

      {/* 试卷信息 */}
      <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
        {currentPaper.subject && (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {currentPaper.subject}
          </span>
        )}
        <span>{currentPaper.questions.length} 道题</span>
        <span>创建于 {new Date(currentPaper.createdAt).toLocaleDateString('zh-CN')}</span>
      </div>

      {/* 题目列表 */}
      <div className="space-y-4">
        {currentPaper.questions.map((q, index) => (
          <div
            key={q._id}
            className="bg-white rounded-lg border border-gray-100 p-5"
          >
            <div className="flex items-start gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {q.subject}
                  </span>
                  {q.knowledgePoints?.map((kp) => (
                    <span key={kp} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {kp}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
                  {q.question}
                </div>
                {q.correctAnswer && (
                  <div className="text-sm">
                    <span className="text-gray-500">正确答案：</span>
                    <span className="text-green-700">{q.correctAnswer}</span>
                  </div>
                )}
                {q.analysis && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span>解析：</span>{q.analysis}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-6">
              确定要删除试卷「{currentPaper.title}」吗？此操作不可恢复，但其中的题目不会被删除。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
