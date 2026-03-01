'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { DashboardStats } from '@/types';

const statCards = [
  { key: 'userCount' as const, label: '用户数', icon: '👤', color: 'bg-blue-500' },
  { key: 'projectCount' as const, label: '项目数', icon: '📁', color: 'bg-green-500' },
  { key: 'questionCount' as const, label: '题目数', icon: '📝', color: 'bg-orange-500' },
  { key: 'paperCount' as const, label: '试卷数', icon: '📄', color: 'bg-purple-500' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch(() => setError('统计数据加载失败'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">数据概览</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-lg shadow p-6 flex items-center gap-4"
          >
            <div
              className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl text-white shrink-0`}
            >
              {card.icon}
            </div>
            <div>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-gray-800">
                  {stats?.[card.key] ?? '-'}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
