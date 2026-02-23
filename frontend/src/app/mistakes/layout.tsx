import { MistakesHeader } from '@/components/MistakesHeader';
import { MistakesSidebar } from '@/components/MistakesSidebar';

export default function MistakesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MistakesHeader />
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
        <MistakesSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </>
  );
}
