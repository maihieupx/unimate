import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isGoogleAuthEnabled } from '@/lib/auth';
import { LoginForm } from '@/components/auth/AuthForms';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect('/');

  const { error } = await searchParams;
  return <LoginForm googleEnabled={isGoogleAuthEnabled} initialError={error} />;
}
