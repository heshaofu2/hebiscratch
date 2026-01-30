'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useMistakesStore } from '@/store/mistakes';
import { mistakesApi } from '@/lib/api';
import {
  SUBJECT_LABELS,
  SUBJECT_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  type Subject,
  type Difficulty,
} from '@/types/mistake';

export default function MistakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { currentMistake, isLoading, fetchMistake, updateMistake, deleteMistake, markReviewed } = useMistakesStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    subject: 'math' as Subject,
    difficulty: 'medium' as Difficulty,
    questionContent: '',
    answerContent: '',
    myAnswer: '',
    analysis: '',
    tags: [] as string[],
    source: '',
    notes: '',
    isMastered: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated && id) {
      fetchMistake(id);
    }
  }, [authLoading, isAuthenticated, id, router, fetchMistake]);

  useEffect(() => {
    if (currentMistake) {
      setEditData({
        title: currentMistake.title,
        subject: currentMistake.subject,
        difficulty: currentMistake.difficulty,
        questionContent: currentMistake.questionContent,
        answerContent: currentMistake.answerContent,
        myAnswer: currentMistake.myAnswer,
        analysis: currentMistake.analysis,
        tags: currentMistake.tags,
        source: currentMistake.source,
        notes: currentMistake.notes,
        isMastered: currentMistake.isMastered,
      });
    }
  }, [currentMistake]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMistake(id, editData);
      setIsEditing(false);
    } catch (err) {
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`确定要删除错题 "${currentMistake?.title}" 吗？此操作不可恢复。`)) {
      await deleteMistake(id);
      router.push('/mistakes');
    }
  };

  const handleMarkReviewed = async () => {
    await markReviewed(id);
  };

  const handleToggleMastered = async () => {
    await updateMistake(id, { isMastered: !currentMistake?.isMastered });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !editData.tags.includes(tag)) {
      setEditData({ ...editData, tags: [...editData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditData({ ...editData, tags: editData.tags.filter((t) => t !== tag) });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!currentMistake) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">错题不存在</h2>
          <button
            onClick={() => router.push('/mistakes')}
            className="text-orange-500 hover:text-orange-600"
          >
            返回错题本
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/mistakes')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回列表
          </button>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleMarkReviewed}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  标记已复习
                </button>
                <button
                  onClick={handleToggleMastered}
                  className={`px-4 py-2 rounded-lg transition ${
                    currentMistake.isMastered
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {currentMistake.isMastered ? '取消掌握' : '标记已掌握'}
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                >
                  删除
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 标题区域 */}
          <div className="p-6 border-b">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full text-2xl font-bold px-0 border-0 border-b-2 border-gray-200 focus:border-orange-500 focus:ring-0"
              />
            ) : (
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{currentMistake.title}</h1>
                {currentMistake.isMastered && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    已掌握
                  </span>
                )}
              </div>
            )}

            {/* 标签 */}
            <div className="flex flex-wrap gap-2 mt-4">
              {isEditing ? (
                <>
                  <select
                    value={editData.subject}
                    onChange={(e) => setEditData({ ...editData, subject: e.target.value as Subject })}
                    className="px-3 py-1 text-sm border rounded-lg"
                  >
                    {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={editData.difficulty}
                    onChange={(e) => setEditData({ ...editData, difficulty: e.target.value as Difficulty })}
                    className="px-3 py-1 text-sm border rounded-lg"
                  >
                    {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span className={`px-3 py-1 text-sm rounded-full ${SUBJECT_COLORS[currentMistake.subject]}`}>
                    {SUBJECT_LABELS[currentMistake.subject]}
                  </span>
                  <span className={`px-3 py-1 text-sm rounded-full ${DIFFICULTY_COLORS[currentMistake.difficulty]}`}>
                    {DIFFICULTY_LABELS[currentMistake.difficulty]}
                  </span>
                </>
              )}
            </div>

            {/* 统计信息 */}
            <div className="flex gap-6 mt-4 text-sm text-gray-500">
              <span>复习 {currentMistake.reviewCount} 次</span>
              <span>创建于 {new Date(currentMistake.createdAt).toLocaleDateString('zh-CN')}</span>
              {currentMistake.lastReviewAt && (
                <span>上次复习 {new Date(currentMistake.lastReviewAt).toLocaleDateString('zh-CN')}</span>
              )}
            </div>
          </div>

          {/* 图片 */}
          {currentMistake.imagePaths.length > 0 && (
            <div className="p-6 border-b bg-gray-50">
              <div className="grid gap-4">
                {currentMistake.imagePaths.map((_, index) => (
                  <img
                    key={index}
                    src={mistakesApi.getImageUrl(id, index)}
                    alt={`题目图片 ${index + 1}`}
                    className="w-full max-h-96 object-contain rounded-lg bg-white"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 题目内容 */}
          <div className="p-6 space-y-6">
            {/* 题目 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">题目内容</h3>
              {isEditing ? (
                <textarea
                  value={editData.questionContent}
                  onChange={(e) => setEditData({ ...editData, questionContent: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {currentMistake.questionContent || '暂无内容'}
                </p>
              )}
            </div>

            {/* 我的答案 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">我的答案（错误答案）</h3>
              {isEditing ? (
                <textarea
                  value={editData.myAnswer}
                  onChange={(e) => setEditData({ ...editData, myAnswer: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <p className="text-red-600 whitespace-pre-wrap">
                  {currentMistake.myAnswer || '暂无内容'}
                </p>
              )}
            </div>

            {/* 正确答案 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">正确答案</h3>
              {isEditing ? (
                <textarea
                  value={editData.answerContent}
                  onChange={(e) => setEditData({ ...editData, answerContent: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <p className="text-green-600 whitespace-pre-wrap">
                  {currentMistake.answerContent || '暂无内容'}
                </p>
              )}
            </div>

            {/* 解析 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">解析</h3>
              {isEditing ? (
                <textarea
                  value={editData.analysis}
                  onChange={(e) => setEditData({ ...editData, analysis: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {currentMistake.analysis || '暂无内容'}
                </p>
              )}
            </div>

            {/* 知识点标签 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">知识点标签</h3>
              {isEditing ? (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="输入标签后按回车"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      添加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center gap-1"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-orange-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentMistake.tags.length > 0 ? (
                    currentMistake.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">暂无标签</span>
                  )}
                </div>
              )}
            </div>

            {/* 来源 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">来源</h3>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.source}
                  onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{currentMistake.source || '暂无内容'}</p>
              )}
            </div>

            {/* 笔记 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">个人笔记</h3>
              {isEditing ? (
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {currentMistake.notes || '暂无内容'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
