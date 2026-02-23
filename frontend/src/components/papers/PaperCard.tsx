'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import type { PaperListItem } from '@/types';

interface PaperCardProps {
  paper: PaperListItem;
}

export function PaperCard({ paper }: PaperCardProps) {
  return (
    <Link
      href={`/mistakes/papers/${paper._id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition truncate">
            {paper.title}
          </h3>
        </div>
        {paper.subject && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {paper.subject}
          </span>
        )}
      </div>

      {paper.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {paper.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{paper.questionCount} 道题</span>
        <span>{new Date(paper.updatedAt).toLocaleDateString('zh-CN')}</span>
      </div>
    </Link>
  );
}
