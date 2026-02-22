'use client';

import { useState } from 'react';
import type { MistakeCreateData } from '@/types';
import { SubjectSelect } from './SubjectSelect';

interface MistakeFormProps {
  onSubmit: (data: MistakeCreateData) => Promise<void>;
  isLoading?: boolean;
}

export function MistakeForm({ onSubmit, isLoading = false }: MistakeFormProps) {
  const [subject, setSubject] = useState('数学');
  const [question, setQuestion] = useState('');
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    await onSubmit({
      subject,
      question: question.trim(),
      wrongAnswer: wrongAnswer.trim(),
      correctAnswer: correctAnswer.trim(),
      analysis: analysis.trim() || undefined,
      tags,
    });

    // 成功后清空表单
    setQuestion('');
    setWrongAnswer('');
    setCorrectAnswer('');
    setAnalysis('');
    setTagsInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">科目</label>
        <SubjectSelect value={subject} onChange={setSubject} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          题目内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="输入完整的题目内容..."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">我的错误答案</label>
          <textarea
            value={wrongAnswer}
            onChange={(e) => setWrongAnswer(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="我当时写的错误答案..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">正确答案</label>
          <textarea
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="正确的答案..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">解析</label>
        <textarea
          value={analysis}
          onChange={(e) => setAnalysis(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="解题思路和知识点..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="用逗号分隔，如：二次方程, 期中考试"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !question.trim()}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '保存中...' : '保存错题'}
      </button>
    </form>
  );
}
