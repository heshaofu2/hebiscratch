'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export function PracticeHeader() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="h-16 bg-indigo-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/practice/questions" className="text-2xl font-bold hover:opacity-90">
          错题本
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-20 h-8 bg-indigo-400 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-1 text-sm hover:bg-indigo-600 rounded transition"
              >
                回到主站
              </Link>
              <span className="text-sm">{user?.username}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm hover:bg-indigo-600 rounded transition"
              >
                退出
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-2 hover:bg-indigo-600 rounded-lg transition"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
