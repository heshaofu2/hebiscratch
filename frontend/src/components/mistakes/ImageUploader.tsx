'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ImageUploader({ onFileSelected, isLoading = false, disabled = false }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(true); } }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { if (!disabled) handleDrop(e); else e.preventDefault(); }}
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : isDragging
              ? 'border-indigo-500 bg-indigo-50 cursor-pointer'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50 cursor-pointer'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          className="hidden"
        />
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-indigo-600 font-medium">AI 正在识别题目...</p>
            <p className="text-xs text-gray-400">这可能需要几秒钟</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-600 font-medium">拖拽图片到这里，或点击上传</p>
            <p className="text-xs text-gray-400">支持 PNG, JPG, WebP 格式</p>
          </div>
        )}
      </div>

      {preview && !isLoading && (
        <div className="relative">
          <img src={preview} alt="预览" className="max-h-48 rounded-lg mx-auto" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
