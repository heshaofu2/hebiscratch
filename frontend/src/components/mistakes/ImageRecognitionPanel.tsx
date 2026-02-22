'use client';

import { useState } from 'react';
import type { RecognizedQuestion, ImageRecognitionResult, MistakeBatchCreateData } from '@/types';
import { SubjectSelect } from './SubjectSelect';

interface ImageRecognitionPanelProps {
  result: ImageRecognitionResult;
  imagePreviewUrl: string;
  onSave: (data: MistakeBatchCreateData) => Promise<void>;
  isLoading?: boolean;
}

export function ImageRecognitionPanel({
  result,
  imagePreviewUrl,
  onSave,
  isLoading = false,
}: ImageRecognitionPanelProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.questions.map((q) => q.index))
  );
  const [subjects, setSubjects] = useState<Record<number, string>>(
    () => Object.fromEntries(result.questions.map((q) => [q.index, q.subjectGuess || '数学']))
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSave = async () => {
    const items = result.questions
      .filter((q) => selected.has(q.index))
      .map((q) => ({
        subject: subjects[q.index] || '数学',
        question: q.question,
        wrongAnswer: q.wrongAnswer,
        correctAnswer: q.correctAnswer,
        analysis: q.analysis,
        sourceImagePath: result.imagePath,
      }));

    if (items.length === 0) return;

    await onSave({ items, sourceImagePath: result.imagePath });
  };

  // 标注颜色（根据题目序号循环）
  const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
  const getColor = (index: number) => COLORS[(index - 1) % COLORS.length];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：图片 + 标注 */}
      <div className="relative bg-gray-100 rounded-xl overflow-hidden">
        <div className="relative">
          <img src={imagePreviewUrl} alt="上传的图片" className="w-full" />
          {/* SVG 标注层 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {result.questions.map((q) => (
              <g key={q.index}>
                <rect
                  x={`${q.bbox.x * 100}%`}
                  y={`${q.bbox.y * 100}%`}
                  width={`${q.bbox.width * 100}%`}
                  height={`${q.bbox.height * 100}%`}
                  fill={hoveredIndex === q.index ? `${getColor(q.index)}20` : 'transparent'}
                  stroke={getColor(q.index)}
                  strokeWidth={hoveredIndex === q.index ? 3 : 2}
                  rx="4"
                />
                {/* 序号标签 */}
                <circle
                  cx={`${q.bbox.x * 100}%`}
                  cy={`${q.bbox.y * 100}%`}
                  r="12"
                  fill={getColor(q.index)}
                />
                <text
                  x={`${q.bbox.x * 100}%`}
                  y={`${q.bbox.y * 100}%`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {q.index}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* 右侧：识别结果列表 */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">
            识别到 {result.questions.length} 道题目
          </h3>
          <button
            onClick={() => {
              if (selected.size === result.questions.length) {
                setSelected(new Set());
              } else {
                setSelected(new Set(result.questions.map((q) => q.index)));
              }
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            {selected.size === result.questions.length ? '取消全选' : '全选'}
          </button>
        </div>

        {result.questions.map((q) => (
          <QuestionItem
            key={q.index}
            question={q}
            isSelected={selected.has(q.index)}
            color={getColor(q.index)}
            subject={subjects[q.index] || '数学'}
            onToggle={() => toggleSelect(q.index)}
            onSubjectChange={(s) => setSubjects((prev) => ({ ...prev, [q.index]: s }))}
            onMouseEnter={() => setHoveredIndex(q.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        <button
          onClick={handleSave}
          disabled={isLoading || selected.size === 0}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : `保存选中的 ${selected.size} 道题目`}
        </button>
      </div>
    </div>
  );
}

function QuestionItem({
  question,
  isSelected,
  color,
  subject,
  onToggle,
  onSubjectChange,
  onMouseEnter,
  onMouseLeave,
}: {
  question: RecognizedQuestion;
  isSelected: boolean;
  color: string;
  subject: string;
  onToggle: () => void;
  onSubjectChange: (s: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`border rounded-lg p-4 transition ${
        isSelected ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 w-4 h-4 text-indigo-600 rounded"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {question.index}
            </span>
            <SubjectSelect
              value={subject}
              onChange={onSubjectChange}
              className="!py-1 !text-xs"
            />
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {expanded ? question.question : question.question.slice(0, 120)}
            {question.question.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-indigo-600 text-xs ml-1"
              >
                {expanded ? '收起' : '...展开'}
              </button>
            )}
          </p>

          {question.correctAnswer && (
            <div className="mt-2 p-2 bg-green-50 rounded text-xs">
              <span className="font-medium text-green-700">正确答案：</span>
              <span className="text-green-800">{question.correctAnswer}</span>
            </div>
          )}
          {question.analysis && (
            <div className="mt-1 p-2 bg-blue-50 rounded text-xs">
              <span className="font-medium text-blue-700">解析：</span>
              <span className="text-blue-800">{question.analysis}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
