'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="h-16 bg-orange-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold hover:opacity-90">
          Scratch
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-20 h-8 bg-orange-400 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <>
              <Link
                href="/editor"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
              >
                创建项目
              </Link>
              <Link
                href="/projects"
                className="px-4 py-2 hover:bg-orange-600 rounded-lg transition"
              >
                我的作品
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin/users"
                  className="px-4 py-2 hover:bg-orange-600 rounded-lg transition"
                >
                  管理后台
                </Link>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm">{user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm hover:bg-orange-600 rounded transition"
                >
                  退出
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 hover:bg-orange-600 rounded-lg transition"
              >
                登录
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-white text-orange-500 hover:bg-gray-100 rounded-lg transition"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
