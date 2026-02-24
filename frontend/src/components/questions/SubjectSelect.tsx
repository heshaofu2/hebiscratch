'use client';

import { SUBJECTS } from '@/types';

interface SubjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  className?: string;
}

export function SubjectSelect({ value, onChange, includeAll = false, className = '' }: SubjectSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
    >
      {includeAll && <option value="">全部科目</option>}
      {SUBJECTS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
