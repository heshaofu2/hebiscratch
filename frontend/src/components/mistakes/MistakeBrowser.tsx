'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { mistakesApi } from '@/lib/api';
import { SubjectTagFilter } from './SubjectTagFilter';
import type { MistakeListItem } from '@/types';

interface MistakeBrowserProps {
  /** 列表项渲染 — 唯一必需 prop */
  renderItem: (mistake: MistakeListItem) => ReactNode;
  /** 列表容器 className（默认 'space-y-2'） */
  listClassName?: string;
  /** 是否显示掌握状态筛选行（默认 false） */
  showMasteredFilter?: boolean;
  /** 操作栏左侧自定义内容（搜索框左边的插槽） */
  toolbarLeft?: ReactNode;
  /** 自定义加载状态 */
  renderLoading?: () => ReactNode;
  /** 自定义空状态 */
  renderEmpty?: () => ReactNode;
  /** 变更此值触发重新获取 */
  refreshKey?: number;
  /** 数据加载完成回调 */
  onDataLoaded?: (mistakes: MistakeListItem[]) => void;
}

export function MistakeBrowser({
  renderItem,
  listClassName = 'space-y-2',
  showMasteredFilter = false,
  toolbarLeft,
  renderLoading,
  renderEmpty,
  refreshKey,
  onDataLoaded,
}: MistakeBrowserProps) {
  const [subjectFilter, setSubjectFilter] = useState<string[]>([]);
  const [masteredFilter, setMasteredFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mistakes, setMistakes] = useState<MistakeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 用 ref 存储回调，避免闭包导致无限重渲染
  const onDataLoadedRef = useRef(onDataLoaded);
  onDataLoadedRef.current = onDataLoaded;

  const fetchMistakes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string[] | boolean | string> = {};
      if (subjectFilter.length > 0) params.subject = subjectFilter;
      if (masteredFilter !== 'all') params.mastered = masteredFilter === 'true';
      if (searchQuery) params.search = searchQuery;

      const list = await mistakesApi.list(params);
      setMistakes(list);
      onDataLoadedRef.current?.(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [subjectFilter, masteredFilter, searchQuery, refreshKey]);

  useEffect(() => {
    fetchMistakes();
  }, [fetchMistakes]);

  return (
    <div className="space-y-3">
      {/* 科目筛选 */}
      <SubjectTagFilter selected={subjectFilter} onChange={setSubjectFilter} />

      {/* 掌握状态筛选 */}
      {showMasteredFilter && (
        <div className="flex items-center gap-2">
          {([
            { value: 'all', label: '全部状态' },
            { value: 'false', label: '未掌握' },
            { value: 'true', label: '已掌握' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setMasteredFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                masteredFilter === value
                  ? value === 'true'
                    ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                    : value === 'false'
                      ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
                      : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 操作栏 + 搜索框 */}
      <div className="flex items-center gap-2">
        {toolbarLeft}
        <div className="flex-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索题目..."
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 列表区 */}
      {isLoading ? (
        renderLoading ? renderLoading() : (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
            加载中...
          </div>
        )
      ) : mistakes.length === 0 ? (
        renderEmpty ? renderEmpty() : (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
            暂无题目
          </div>
        )
      ) : (
        <div className={listClassName}>
          {mistakes.map((m) => renderItem(m))}
        </div>
      )}
    </div>
  );
}
