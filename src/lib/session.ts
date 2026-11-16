import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { HttpError } from './http';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.error) return null;
  return session.user;
}

/** For API routes: throws 401. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'UNAUTHORIZED');
  return user;
}

/** For API routes: throws 401/403. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new HttpError(403, 'FORBIDDEN');
  return user;
}

/** For server components/pages: redirects instead of throwing. */
export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requirePageAdmin() {
  const user = await requirePageUser();
  if (user.role !== 'ADMIN') redirect('/');
  return user;
}
