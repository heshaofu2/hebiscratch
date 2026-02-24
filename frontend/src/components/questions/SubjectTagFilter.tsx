'use client';

import { SUBJECTS } from '@/types';
import { SUBJECT_COLORS } from './SubjectBadge';

interface SubjectTagFilterProps {
  selected: string[];
  onChange: (subjects: string[]) => void;
}

/** 选中态：使用学科专属颜色；未选中态：统一灰色 */
const UNSELECTED = 'bg-gray-100 text-gray-500 hover:bg-gray-200';

export function SubjectTagFilter({ selected, onChange }: SubjectTagFilterProps) {
  const isAll = selected.length === 0;

  const toggle = (subject: string) => {
    if (selected.includes(subject)) {
      onChange(selected.filter((s) => s !== subject));
    } else {
      onChange([...selected, subject]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "全部" 标签 */}
      <button
        onClick={() => onChange([])}
        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
          isAll
            ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
            : UNSELECTED
        }`}
      >
        全部学科
      </button>

      {/* 各学科标签 */}
      {SUBJECTS.map((subject) => {
        const active = selected.includes(subject);
        const colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他'];
        return (
          <button
            key={subject}
            onClick={() => toggle(subject)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              active ? `${colors} ring-1 ring-current/30` : UNSELECTED
            }`}
          >
            {subject}
          </button>
        );
      })}
    </div>
  );
}
