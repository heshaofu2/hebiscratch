'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { projectsApi } from '@/lib/api';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('请输入项目名称');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      // 检查是否存在同名项目
      const exists = await projectsApi.checkName(trimmedTitle);
      if (exists) {
        setError('已存在同名项目，请使用其他名称');
        return;
      }

      // 不创建 DB 记录，直接打开编辑器，将标题通过 URL 参数传递
      // 项目会在用户首次保存时才创建
      onOpenChange(false);
      window.open(`/editor?title=${encodeURIComponent(trimmedTitle)}`, '_blank');
    } catch {
      setError('检查项目名称时出错，请重试');
    } finally {
      setIsChecking(false);
    }
  }, [title, onOpenChange]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // 关闭时重置状态
      setTitle('');
      setError('');
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="project-title" className="text-sm font-medium text-gray-700">
                项目名称
              </label>
              <Input
                id="project-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="请输入项目名称"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isChecking}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isChecking || !title.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isChecking ? '检查中...' : '确认'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
