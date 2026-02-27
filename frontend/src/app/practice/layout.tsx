'use client';

import { PracticeHeader } from '@/components/PracticeHeader';
import { PracticeSidebar } from '@/components/PracticeSidebar';
import { AuthGuard } from '@/components/AuthGuard';

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PracticeHeader />
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
        <PracticeSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
