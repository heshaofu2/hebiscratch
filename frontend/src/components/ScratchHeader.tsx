'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export function ScratchHeader() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  // 编辑器页面不显示 Header，编辑器有自己的工具栏
  if (pathname?.startsWith('/editor')) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="h-16 bg-orange-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold hover:opacity-90">
          Scratch 编程
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-20 h-8 bg-orange-400 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">{user?.username}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm hover:bg-orange-600 rounded transition"
              >
                退出
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 hover:bg-orange-600 rounded-lg transition"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
