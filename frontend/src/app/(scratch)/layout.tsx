'use client';

import { ScratchHeader } from '@/components/ScratchHeader';
import { AuthGuard } from '@/components/AuthGuard';

export default function ScratchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ScratchHeader />
      {children}
    </AuthGuard>
  );
}
