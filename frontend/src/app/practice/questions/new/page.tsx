'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionsStore } from '@/store/questions';
import { useAuthStore } from '@/store/auth';
import { QuestionForm } from '@/components/questions/QuestionForm';
import { ImageUploader } from '@/components/questions/ImageUploader';
import { ImageRecognitionPanel } from '@/components/questions/ImageRecognitionPanel';
import type { QuestionCreateData, QuestionBatchCreateData } from '@/types';

type Tab = 'manual' | 'image';

export default function NewQuestionPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('image');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const {
    recognitionResult,
    isLoading,
    isRecognizing,
    createQuestion,
    createBatch,
    recognizeImage,
    clearRecognitionResult,
  } = useQuestionsStore();

  const recognizeLimit = user?.recognizeLimit ?? null;
  const recognizeCount = user?.recognizeCount ?? 0;
  const isQuotaExhausted = recognizeLimit !== null && recognizeCount >= recognizeLimit;

  const handleManualSubmit = async (data: QuestionCreateData) => {
    await createQuestion(data);
    router.push('/practice/questions');
  };

  const handleFileSelected = async (file: File) => {
    setImagePreviewUrl(URL.createObjectURL(file));
    clearRecognitionResult();
    await recognizeImage(file);
    // 识别成功后刷新用户信息以更新配额显示
    useAuthStore.getState().fetchUser();
  };

  const handleBatchSave = async (data: QuestionBatchCreateData) => {
    await createBatch(data);
    clearRecognitionResult();
    router.push('/practice/questions');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">添加错题</h1>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('image')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition ${
              tab === 'image'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            图片识别
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition ${
              tab === 'manual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            手动录入
          </button>
        </div>

        {/* 内容区 */}
        {tab === 'manual' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <QuestionForm onSubmit={handleManualSubmit} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-6">
            {!recognitionResult && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {recognizeLimit !== null && (
                  <div className={`mb-4 text-sm ${isQuotaExhausted ? 'text-red-600' : 'text-gray-500'}`}>
                    {isQuotaExhausted
                      ? `图片识别额度已用完（${recognizeCount} / ${recognizeLimit}），请联系管理员提升额度`
                      : `图片识别额度：${recognizeCount} / ${recognizeLimit}`}
                  </div>
                )}
                <ImageUploader
                  onFileSelected={handleFileSelected}
                  isLoading={isRecognizing}
                  disabled={isQuotaExhausted}
                />
              </div>
            )}
            {recognitionResult && imagePreviewUrl && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <ImageRecognitionPanel
                  result={recognitionResult}
                  imagePreviewUrl={imagePreviewUrl}
                  onSave={handleBatchSave}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
