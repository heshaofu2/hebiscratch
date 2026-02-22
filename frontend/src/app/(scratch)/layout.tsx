import { ScratchHeader } from '@/components/ScratchHeader';

export default function ScratchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScratchHeader />
      {children}
    </>
  );
}
