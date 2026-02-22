import { HomeNavbar } from '@/components/HomeNavbar';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HomeNavbar />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </>
  );
}
