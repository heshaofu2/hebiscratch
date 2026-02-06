'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { useProjectsStore } from '@/store/projects';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter();
  const { createProject } = useProjectsStore();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('请输入项目名称');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // 先检查是否存在同名项目
      const exists = await projectsApi.checkName(trimmedTitle);
      if (exists) {
        setError('已存在同名项目，请使用其他名称');
        return;
      }

      // 创建项目（空项目，不含 projectJson）
      const newProject = await createProject({
        title: trimmedTitle,
        projectJson: {}
      });

      // 创建成功，在新标签页打开编辑器
      onOpenChange(false);
      window.open(`/editor/${newProject._id}`, '_blank');
    } catch {
      setError('创建项目时出错，请重试');
    } finally {
      setIsCreating(false);
    }
  }, [title, router, onOpenChange, createProject]);

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
              disabled={isCreating}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isCreating ? '创建中...' : '确认'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
