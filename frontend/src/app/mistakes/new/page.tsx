'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useMistakesStore } from '@/store/mistakes';
import { mistakesApi } from '@/lib/api';
import {
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
  type Subject,
  type Difficulty,
  type AIExtractResult,
} from '@/types/mistake';

export default function NewMistakePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { createMistake, uploadImage } = useMistakesStore();

  const [step, setStep] = useState<'upload' | 'extracting' | 'edit'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<AIExtractResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
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
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleExtract = async () => {
    if (!imageFile) return;

    setStep('extracting');
    setExtractError(null);

    try {
      // 先创建一个临时错题记录
      const mistake = await createMistake({
        title: '新错题',
        subject: 'other',
      });

      // 上传图片
      await uploadImage(mistake._id, imageFile);

      // 调用 AI 识别
      try {
        const result = await mistakesApi.extractContent(mistake._id);
        setExtractResult(result);

        // 用 AI 结果填充表单
        setFormData({
          ...formData,
          title: result.questionContent.slice(0, 50) || '新错题',
          subject: result.suggestedSubject,
          questionContent: result.questionContent,
          answerContent: result.answerContent,
          analysis: result.analysis,
          tags: result.suggestedTags,
        });
      } catch (err) {
        // AI 识别失败，但错题已创建，用户可以手动填写
        setExtractError('AI 识别失败，请手动填写内容');
      }

      // 更新表单使用已创建的错题 ID
      setFormData((prev) => ({
        ...prev,
        _id: mistake._id,
      }));

      setStep('edit');
    } catch (err) {
      setExtractError('创建失败，请重试');
      setStep('upload');
    }
  };

  const handleSkipExtract = async () => {
    if (!imageFile) {
      // 没有图片，直接进入编辑
      setStep('edit');
      return;
    }

    setStep('extracting');
    try {
      // 创建错题记录
      const mistake = await createMistake({
        title: '新错题',
        subject: 'other',
      });

      // 上传图片
      await uploadImage(mistake._id, imageFile);

      setFormData((prev) => ({
        ...prev,
        _id: mistake._id,
      }));

      setStep('edit');
    } catch (err) {
      setExtractError('创建失败，请重试');
      setStep('upload');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }

    setIsSubmitting(true);
    try {
      // 如果已经有 _id（通过上传图片创建的），更新它
      if ((formData as { _id?: string })._id) {
        const { _id, ...updateData } = formData as typeof formData & { _id: string };
        await mistakesApi.update(_id, updateData);
      } else {
        // 没有图片，直接创建
        await createMistake(formData);
      }

      router.push('/mistakes');
    } catch (err) {
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">添加错题</h1>

        {/* 步骤指示器 */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center ${step === 'upload' ? 'text-orange-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'upload' ? 'bg-orange-500 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="ml-2">上传图片</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-200 mx-4"></div>
          <div className={`flex items-center ${step === 'extracting' ? 'text-orange-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'extracting' ? 'bg-orange-500 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="ml-2">AI 识别</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-200 mx-4"></div>
          <div className={`flex items-center ${step === 'edit' ? 'text-orange-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'edit' ? 'bg-orange-500 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="ml-2">编辑保存</span>
          </div>
        </div>

        {/* 步骤 1: 上传图片 */}
        {step === 'upload' && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition"
              >
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-600 mb-2">点击拍照或选择图片</p>
                <p className="text-sm text-gray-400">支持 JPG、PNG，最大 10MB</p>
              </div>
            ) : (
              <div>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-96 object-contain rounded-lg mb-4"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={handleExtract}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    AI 识别
                  </button>
                  <button
                    onClick={handleSkipExtract}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    跳过识别
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setStep('edit')}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                不上传图片，直接手动录入
              </button>
            </div>
          </div>
        )}

        {/* 步骤 2: AI 识别中 */}
        {step === 'extracting' && (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-6"></div>
            <p className="text-xl text-gray-700">AI 正在识别题目内容...</p>
            <p className="text-gray-500 mt-2">请稍候</p>
          </div>
        )}

        {/* 步骤 3: 编辑表单 */}
        {step === 'edit' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-sm space-y-6">
            {extractError && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                {extractError}
              </div>
            )}

            {imagePreview && (
              <div className="mb-6">
                <img
                  src={imagePreview}
                  alt="题目图片"
                  className="w-full max-h-64 object-contain rounded-lg bg-gray-100"
                />
              </div>
            )}

            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="输入错题标题"
              />
            </div>

            {/* 学科和难度 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学科</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value as Subject })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 题目内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">题目内容</label>
              <textarea
                value={formData.questionContent}
                onChange={(e) => setFormData({ ...formData, questionContent: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="输入题目内容"
              />
            </div>

            {/* 我的答案 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">我的答案（错误答案）</label>
              <textarea
                value={formData.myAnswer}
                onChange={(e) => setFormData({ ...formData, myAnswer: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="输入你的错误答案"
              />
            </div>

            {/* 正确答案 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">正确答案</label>
              <textarea
                value={formData.answerContent}
                onChange={(e) => setFormData({ ...formData, answerContent: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="输入正确答案"
              />
            </div>

            {/* 解析 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">解析</label>
              <textarea
                value={formData.analysis}
                onChange={(e) => setFormData({ ...formData, analysis: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="输入题目解析"
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">知识点标签</label>
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
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
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
              )}
            </div>

            {/* 来源 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="例如：2024年期中考试、课本第三章"
              />
            </div>

            {/* 笔记 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">个人笔记</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="记录你的思考和总结"
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
