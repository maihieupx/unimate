'use server';

import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALE_COOKIE, isLocale, type AppLocale } from './config';

export async function setLocale(locale: AppLocale) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  // Persist the preference for signed-in users (used for AI output language as well).
  const session = await getServerSession(authOptions);
  if (session?.user?.id && !session.error) {
    await prisma.user.update({ where: { id: session.user.id }, data: { locale } }).catch(() => undefined);
  }
}
