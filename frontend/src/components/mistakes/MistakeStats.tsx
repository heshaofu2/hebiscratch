'use client';

import type { MistakeStats as MistakeStatsType } from '@/types';
import { SubjectBadge } from './SubjectBadge';

export function MistakeStats({ stats }: { stats: MistakeStatsType | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const masteredPercent = stats.total > 0
    ? Math.round((stats.mastered / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">总题数</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">已掌握</p>
          <p className="text-3xl font-bold text-green-600">{stats.mastered}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">掌握率</p>
          <p className="text-3xl font-bold text-indigo-600">{masteredPercent}%</p>
        </div>
      </div>

      {Object.keys(stats.subjects).length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-3">各科目分布</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.subjects)
              .sort(([, a], [, b]) => b - a)
              .map(([subject, count]) => (
                <div key={subject} className="flex items-center gap-1.5">
                  <SubjectBadge subject={subject} />
                  <span className="text-sm font-medium text-gray-700">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
