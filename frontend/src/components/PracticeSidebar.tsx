'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileText } from 'lucide-react';

const navItems = [
  { href: '/practice/questions', label: '题库管理', icon: BookOpen },
  { href: '/practice/papers', label: '试卷管理', icon: FileText },
];

export function PracticeSidebar() {
  const pathname = usePathname();

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* 移动端：水平标签栏 */}
      <nav className="flex md:hidden bg-white border-b border-gray-200">
        {navItems.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm transition ${
                active
                  ? 'text-indigo-600 border-b-2 border-indigo-500 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 桌面端：垂直侧边栏 */}
      <aside className="hidden md:block w-48 bg-white border-r border-gray-200 shrink-0">
        <nav className="py-4">
          {navItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-500 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
