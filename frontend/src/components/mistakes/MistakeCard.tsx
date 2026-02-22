'use client';

import Link from 'next/link';
import type { MistakeListItem } from '@/types';
import { SubjectBadge } from './SubjectBadge';

export function MistakeCard({ mistake }: { mistake: MistakeListItem }) {
  return (
    <Link
      href={`/mistakes/${mistake._id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition group"
    >
      <div className="flex items-center justify-between mb-3">
        <SubjectBadge subject={mistake.subject} />
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {mistake.source === 'image' && (
            <span title="图片识别">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          )}
          <span>复习 {mistake.reviewCount} 次</span>
        </div>
      </div>

      <p className="text-sm text-gray-700 line-clamp-3 mb-3 group-hover:text-gray-900">
        {mistake.question}
      </p>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            mistake.isMastered
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {mistake.isMastered ? '已掌握' : '未掌握'}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(mistake.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
    </Link>
  );
}
