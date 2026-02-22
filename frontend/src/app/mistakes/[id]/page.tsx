'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMistakesStore } from '@/store/mistakes';
import { mistakesApi } from '@/lib/api';
import { SubjectBadge } from '@/components/mistakes/SubjectBadge';
import { SubjectSelect } from '@/components/mistakes/SubjectSelect';

export default function MistakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    currentMistake: mistake,
    isLoading,
    fetchMistake,
    updateMistake,
    deleteMistake,
    reviewMistake,
  } = useMistakesStore();

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

  useEffect(() => {
    if (id) fetchMistake(id);
  }, [id, fetchMistake]);

  useEffect(() => {
    if (mistake) {
      setEditForm({
        subject: mistake.subject,
        question: mistake.question,
        wrongAnswer: mistake.wrongAnswer,
        correctAnswer: mistake.correctAnswer,
        analysis: mistake.analysis || '',
      });
    }
  }, [mistake]);

  // 通过后端代理加载图片（避免 MinIO 直连跨域问题）
  useEffect(() => {
    if (!mistake) return;
    const hasImage = mistake.croppedImagePath || mistake.sourceImagePath;
    if (!hasImage) return;

    let revoked = false;
    const urls: string[] = [];

    mistakesApi.getImageUrl(mistake._id)
      .then(url => { if (!revoked) { urls.push(url); setImageUrl(url); } })
      .catch(() => {});

    if (mistake.croppedImagePath && mistake.sourceImagePath) {
      mistakesApi.getSourceImageUrl(mistake._id)
        .then(url => { if (!revoked) { urls.push(url); setSourceImageUrl(url); } })
        .catch(() => {});
    }

    return () => {
      revoked = true;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [mistake?._id, mistake?.croppedImagePath, mistake?.sourceImagePath]);

  const handleSaveEdit = async () => {
    if (!mistake) return;
    await updateMistake(mistake._id, editForm);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!mistake) return;
    await deleteMistake(mistake._id);
    router.push('/mistakes');
  };

  const handleToggleMastered = async () => {
    if (!mistake) return;
    await updateMistake(mistake._id, { isMastered: !mistake.isMastered });
  };

  const handleReview = async () => {
    if (!mistake) return;
    await reviewMistake(mistake._id);
  };

  if (isLoading || !mistake) {
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
              onClick={() => router.push('/mistakes')}
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
                <SubjectBadge subject={mistake.subject} />
              )}
              <span className="text-xs text-gray-400">
                {mistake.source === 'image' ? '图片识别' : '手动录入'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMastered}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition ${
                  mistake.isMastered
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {mistake.isMastered ? '已掌握' : '未掌握'}
              </button>
              <button
                onClick={handleReview}
                className="px-4 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-full font-medium hover:bg-indigo-200 transition"
              >
                复习 ({mistake.reviewCount})
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
              <p className="text-gray-900 whitespace-pre-wrap">{mistake.question}</p>
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
                  <p className="text-red-800 text-sm">{mistake.wrongAnswer || '未记录'}</p>
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
                  <p className="text-green-800 text-sm">{mistake.correctAnswer || '未记录'}</p>
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
                  {mistake.analysis || '暂无解析'}
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
                {mistake.croppedImagePath ? '题目图片' : '原始图片'}
              </label>
              <img
                src={imageUrl}
                alt="题目图片"
                className="max-h-80 rounded-lg border border-gray-200"
              />
              {sourceImageUrl && (
                <details className="mt-3">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    查看原始完整图片
                  </summary>
                  <img
                    src={sourceImageUrl}
                    alt="原始完整图片"
                    className="mt-2 max-h-96 rounded-lg border border-gray-200"
                  />
                </details>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="pt-4 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
            <span>创建时间：{new Date(mistake.createdAt).toLocaleString('zh-CN')}</span>
            <span>更新时间：{new Date(mistake.updatedAt).toLocaleString('zh-CN')}</span>
            {mistake.tags.length > 0 && (
              <span>标签：{mistake.tags.join(', ')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
