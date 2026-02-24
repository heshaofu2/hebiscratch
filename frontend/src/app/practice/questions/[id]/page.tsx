'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuestionsStore } from '@/store/questions';
import { questionsApi } from '@/lib/api';
import { SubjectBadge } from '@/components/questions/SubjectBadge';
import { SubjectSelect } from '@/components/questions/SubjectSelect';

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    currentQuestion: question,
    isLoading,
    fetchQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuestionsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: '',
    question: '',
    wrongAnswer: '',
    correctAnswer: '',
    analysis: '',
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchQuestion(id);
  }, [id, fetchQuestion]);

  useEffect(() => {
    if (question) {
      setEditForm({
        subject: question.subject,
        question: question.question,
        wrongAnswer: question.wrongAnswer,
        correctAnswer: question.correctAnswer,
        analysis: question.analysis || '',
      });
    }
  }, [question]);

  // 通过后端代理加载图片（避免 MinIO 直连跨域问题）
  useEffect(() => {
    if (!question) return;
    const hasImage = question.croppedImagePath || question.sourceImagePath;
    if (!hasImage) return;

    let revoked = false;
    const urls: string[] = [];

    questionsApi.getImageUrl(question._id)
      .then(url => { if (!revoked) { urls.push(url); setImageUrl(url); } })
      .catch(() => {});

    if (question.croppedImagePath && question.sourceImagePath) {
      questionsApi.getSourceImageUrl(question._id)
        .then(url => { if (!revoked) { urls.push(url); setSourceImageUrl(url); } })
        .catch(() => {});
    }

    return () => {
      revoked = true;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [question?._id, question?.croppedImagePath, question?.sourceImagePath]);

  const handleSaveEdit = async () => {
    if (!question) return;
    await updateQuestion(question._id, editForm);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!question) return;
    await deleteQuestion(question._id);
    router.push('/practice/questions');
  };

  const handleToggleMastered = async () => {
    if (!question) return;
    await updateQuestion(question._id, { isMastered: !question.isMastered });
  };


  if (isLoading || !question) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/practice/questions')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">错题详情</h1>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                编辑
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
            >
              删除
            </button>
          </div>
        </div>

        {/* 删除确认 */}
        {showDeleteConfirm && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-red-700">确定要删除这道错题吗？此操作不可撤销。</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white transition"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                确认删除
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* 操作栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEditing ? (
                <SubjectSelect
                  value={editForm.subject}
                  onChange={(v) => setEditForm((f) => ({ ...f, subject: v }))}
                />
              ) : (
                <SubjectBadge subject={question.subject} />
              )}
              <span className="text-xs text-gray-400">
                {question.source === 'image' ? '图片识别' : '手动录入'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMastered}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition ${
                  question.isMastered
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {question.isMastered ? '已掌握' : '未掌握'}
              </button>
            </div>
          </div>

          {/* 题目 */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">题目</label>
            {isEditing ? (
              <textarea
                value={editForm.question}
                onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">{question.question}</p>
            )}
          </div>

          {/* 错误答案 + 正确答案 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">我的错误答案</label>
              {isEditing ? (
                <textarea
                  value={editForm.wrongAnswer}
                  onChange={(e) => setEditForm((f) => ({ ...f, wrongAnswer: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-red-800 text-sm">{question.wrongAnswer || '未记录'}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">正确答案</label>
              {isEditing ? (
                <textarea
                  value={editForm.correctAnswer}
                  onChange={(e) => setEditForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-green-800 text-sm">{question.correctAnswer || '未记录'}</p>
                </div>
              )}
            </div>
          </div>

          {/* 解析 */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">解析</label>
            {isEditing ? (
              <textarea
                value={editForm.analysis}
                onChange={(e) => setEditForm((f) => ({ ...f, analysis: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm whitespace-pre-wrap">
                  {question.analysis || '暂无解析'}
                </p>
              </div>
            )}
          </div>

          {/* 编辑模式按钮 */}
          {isEditing && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                保存
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>
          )}

          {/* 题目图片 */}
          {imageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                {question.croppedImagePath ? '题目图片' : '原始图片'}
              </label>
              <img
                src={imageUrl}
                alt="题目图片"
                onClick={() => setLightboxSrc(imageUrl)}
                className="max-h-80 rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-90 transition"
              />
              {sourceImageUrl && (
                <details className="mt-3">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    查看原始完整图片
                  </summary>
                  <img
                    src={sourceImageUrl}
                    alt="原始完整图片"
                    onClick={() => setLightboxSrc(sourceImageUrl)}
                    className="mt-2 max-h-96 rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-90 transition"
                  />
                </details>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="pt-4 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
            <span>创建时间：{new Date(question.createdAt).toLocaleString('zh-CN')}</span>
            <span>更新时间：{new Date(question.updatedAt).toLocaleString('zh-CN')}</span>
            {question.knowledgePoints.length > 0 && (
              <span>知识点：{question.knowledgePoints.join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      {/* 图片放大浮窗 */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="放大查看"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
