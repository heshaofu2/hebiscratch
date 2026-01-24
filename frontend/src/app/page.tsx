'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            欢迎来到 <span className="text-orange-500">Scratch</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            使用积木块编程，创造你自己的交互式故事、游戏和动画。
            释放你的创造力，与全世界分享你的作品。
          </p>

          {isLoading ? (
            <div className="h-12 w-40 mx-auto bg-gray-200 animate-pulse rounded-lg" />
          ) : isAuthenticated ? (
            <div className="flex gap-4 justify-center">
              <Link
                href="/editor"
                className="px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-lg hover:bg-orange-600 transition shadow-lg"
              >
                开始创作
              </Link>
              <Link
                href="/projects"
                className="px-8 py-3 bg-white text-orange-500 text-lg font-semibold rounded-lg hover:bg-gray-50 transition shadow-lg border border-orange-200"
              >
                我的作品
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/register"
                className="px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-lg hover:bg-orange-600 transition shadow-lg"
              >
                免费注册
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-3 bg-white text-orange-500 text-lg font-semibold rounded-lg hover:bg-gray-50 transition shadow-lg border border-orange-200"
              >
                登录
              </Link>
            </div>
          )}
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">简单易学</h3>
            <p className="text-gray-600">
              拖拽积木块即可编程，无需学习复杂的语法，适合所有年龄段的初学者。
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">发挥创意</h3>
            <p className="text-gray-600">
              创建游戏、动画、音乐和艺术作品，将你的想象力变为现实。
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">分享作品</h3>
            <p className="text-gray-600">
              一键分享你的作品，让朋友和家人都能看到你的创意。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
