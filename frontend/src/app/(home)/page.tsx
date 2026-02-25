'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  const handleCardClick = (href: string) => () => {
    if (isAuthenticated) {
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* 标题区 */}
        <div className="text-center mb-16">
          <img src="/icon.svg" alt="万能口袋" className="h-28 w-28 mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            阿谦的<span className="text-orange-500">万能口袋</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            编程创作与学习成长的魔法空间，用积木编程释放创造力，用错题本攻克学习难关。
          </p>

          {!isLoading && !isAuthenticated && (
            <div className="flex gap-4 justify-center mt-8">
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

        {/* 双功能卡片 */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {/* Scratch 编程卡片 */}
          <div
            onClick={handleCardClick('/projects')}
            role="link"
            tabIndex={0}
            className="group relative bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">Scratch 编程</h2>
            <p className="text-orange-100 mb-6">
              拖拽积木块创造交互式故事、游戏和动画，释放你的创造力！
            </p>
            <span className="inline-flex items-center text-sm font-medium text-white/90 group-hover:text-white">
              {isAuthenticated ? '进入工作台' : '登录后使用'}
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>

          {/* 错题本卡片 */}
          <div
            onClick={handleCardClick('/practice/questions')}
            role="link"
            tabIndex={0}
            className="group relative bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">错题本</h2>
            <p className="text-indigo-100 mb-6">
              拍照自动识别错题，AI 解答解析，科学复习攻克学习难关！
            </p>
            <span className="inline-flex items-center text-sm font-medium text-white/90 group-hover:text-white">
              {isAuthenticated ? '打开错题本' : '登录后使用'}
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>

        {/* 特性卡片 */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">简单易学</h3>
            <p className="text-xs text-gray-600">
              拖拽积木块即可编程，适合所有年龄段。
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">分享作品</h3>
            <p className="text-xs text-gray-600">
              一键分享，让朋友和家人看到你的创意。
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">拍照识题</h3>
            <p className="text-xs text-gray-600">
              拍照上传，AI 自动识别题目并解答。
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">科学复习</h3>
            <p className="text-xs text-gray-600">
              统计分析错题，追踪学习进度。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
