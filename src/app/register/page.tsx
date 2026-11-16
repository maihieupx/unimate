import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isGoogleAuthEnabled } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/AuthForms';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return <RegisterForm googleEnabled={isGoogleAuthEnabled} />;
}
