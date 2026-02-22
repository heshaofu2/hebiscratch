import { MistakesHeader } from '@/components/MistakesHeader';

export default function MistakesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MistakesHeader />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </>
  );
}
