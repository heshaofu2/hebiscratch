'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { papersApi } from '@/lib/api';
import type { Paper } from '@/types';

export default function PrintPaperPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await papersApi.get(id);
        setPaper(data);
      } catch {
        router.push('/mistakes/papers');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !paper) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {/* 工具栏 — 打印时隐藏 */}
      <div className="print:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">打印预览</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            显示答案
          </label>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition font-medium"
          >
            <Printer className="w-4 h-4" />
            打印 / 导出 PDF
          </button>
        </div>
      </div>

      {/* 打印内容 */}
      <div className="max-w-[210mm] mx-auto bg-white p-8 print:p-0 print:max-w-none">
        {/* 试卷标题 */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{paper.title}</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            {paper.subject && <span>{paper.subject}</span>}
            <span>共 {paper.questions.length} 题</span>
          </div>
        </div>

        {/* 姓名/班级行 */}
        <div className="flex items-center gap-8 mb-8 print:mb-6 text-sm text-gray-600 border-b border-gray-300 pb-4">
          <span>姓名：_______________</span>
          <span>班级：_______________</span>
          <span>日期：_______________</span>
        </div>

        {/* 题目列表 */}
        <div className="space-y-6 print:space-y-4">
          {paper.questions.map((q, index) => (
            <div key={q._id} className="print:break-inside-avoid">
              <div className="flex items-start gap-3">
                <span className="shrink-0 font-bold text-gray-700">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {q.question}
                  </div>

                  {/* 答题空间 */}
                  {!showAnswers && (
                    <div className="mt-4 mb-2 border-b border-dashed border-gray-200 pb-8 print:pb-12" />
                  )}

                  {/* 答案区域 */}
                  {showAnswers && (
                    <div className="mt-3 p-3 bg-gray-50 rounded print:bg-transparent print:border print:border-gray-200">
                      {q.correctAnswer && (
                        <p className="text-sm text-green-700">
                          <span className="font-medium">答案：</span>{q.correctAnswer}
                        </p>
                      )}
                      {q.analysis && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">解析：</span>{q.analysis}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          /* 隐藏所有非打印内容 */
          body > *:not(#__next) { display: none !important; }

          /* 隐藏 header 和 sidebar */
          nav, aside, .print\\:hidden { display: none !important; }

          /* 打印时的布局调整 */
          main { margin: 0 !important; padding: 0 !important; }

          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}
