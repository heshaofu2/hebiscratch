'use client';

const SUBJECT_COLORS: Record<string, string> = {
  '语文': 'bg-red-100 text-red-700',
  '数学': 'bg-blue-100 text-blue-700',
  '英语': 'bg-purple-100 text-purple-700',
  '物理': 'bg-cyan-100 text-cyan-700',
  '化学': 'bg-green-100 text-green-700',
  '生物': 'bg-lime-100 text-lime-700',
  '历史': 'bg-amber-100 text-amber-700',
  '地理': 'bg-teal-100 text-teal-700',
  '政治': 'bg-rose-100 text-rose-700',
  '其他': 'bg-gray-100 text-gray-700',
};

export function SubjectBadge({ subject }: { subject: string }) {
  const colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他'];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {subject}
    </span>
  );
}
