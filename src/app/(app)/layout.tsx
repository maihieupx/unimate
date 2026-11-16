import { requirePageUser } from '@/lib/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <Sidebar isAdmin={user.role === 'ADMIN'} />
      <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pl-32 md:pr-8">
        <Topbar user={{ name: user.name, email: user.email, image: user.image }} />
        <main className="mt-6 sm:mt-8">{children}</main>
      </div>
    </div>
  );
}
