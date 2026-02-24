'use client';

import Link from 'next/link';
import type { QuestionListItem } from '@/types';
import { SubjectBadge } from './SubjectBadge';

interface QuestionCardProps {
  question: QuestionListItem;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function QuestionCard({
  question,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: QuestionCardProps) {
  const cardContent = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSelectMode && (
            <span
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          )}
          <SubjectBadge subject={question.subject} />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {question.source === 'image' && (
            <span title="图片识别">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 line-clamp-3 mb-3 group-hover:text-gray-900">
        {question.question}
      </p>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            question.isMastered
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {question.isMastered ? '已掌握' : '未掌握'}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(question.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
    </>
  );

  if (isSelectMode) {
    return (
      <div
        onClick={() => onToggleSelect?.(question._id)}
        className={`block bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition group ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-gray-100 hover:shadow-md hover:border-indigo-200'
        }`}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={`/practice/questions/${question._id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition group"
    >
      {cardContent}
    </Link>
  );
}
