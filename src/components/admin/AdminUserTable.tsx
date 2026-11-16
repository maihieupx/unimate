'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle2, LogOut, Shield, ShieldOff } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { AccountStatus, Role } from '@prisma/client';
import { Avatar } from '@/components/ui/Avatar';
import { cn, isOnline } from '@/lib/utils';

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  status: AccountStatus;
  loginCount: number;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  hasActiveSession: boolean;
}

type AdminAction = 'SUSPEND' | 'ACTIVATE' | 'FORCE_LOGOUT' | 'MAKE_ADMIN' | 'MAKE_USER';

export function AdminUserTable({
  users,
  currentAdminId,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
}) {
  const t = useTranslations('admin');
  const format = useFormatter();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const runAction = async (userId: string, action: AdminAction) => {
    setBusyId(userId);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      setNotice(t('actionSuccess'));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title">{t('usersTableTitle')}</h2>
        {notice && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">{notice}</span>}
        {error && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-600">{error}</span>}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-lavender-100 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
              <th className="pb-3 pr-4">{t('colUser')}</th>
              <th className="pb-3 pr-4">{t('colRoleStatus')}</th>
              <th className="pb-3 pr-4">{t('colPresence')}</th>
              <th className="pb-3 pr-4">{t('colLogins')}</th>
              <th className="pb-3 pr-4">{t('colLastLogin')}</th>
              <th className="pb-3 text-right">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lavender-100/70">
            {users.map((u) => {
              const online = u.hasActiveSession && isOnline(u.lastSeenAt);
              const isSelf = u.id === currentAdminId;
              const busy = busyId === u.id;

              return (
                <tr key={u.id} className="align-middle">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} image={u.image} size="sm" online={online} />
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-ink">{u.name ?? 'User'}</p>
                        <p className="truncate text-xs font-semibold text-ink-soft">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold',
                          u.role === 'ADMIN' ? 'bg-lavender-600 text-white' : 'bg-lavender-100 text-lavender-700',
                        )}
                      >
                        {u.role}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold',
                          u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600',
                        )}
                      >
                        {u.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold',
                        online ? 'bg-emerald-50 text-emerald-700' : 'bg-lavender-50 text-ink-soft',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-ink-muted')} />
                      {online ? t('onlineBadge') : t('offlineBadge')}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-black tabular-nums text-ink">{u.loginCount}</td>
                  <td className="py-3.5 pr-4 text-xs font-semibold text-ink-soft">
                    {u.lastLoginAt
                      ? format.dateTime(new Date(u.lastLoginAt), { dateStyle: 'short', timeStyle: 'short' })
                      : t('neverLoggedIn')}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      {!isSelf && u.hasActiveSession && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(u.id, 'FORCE_LOGOUT')}
                          className="inline-flex items-center gap-1 rounded-full bg-butter-100 px-3 py-1 text-xs font-extrabold text-ink transition hover:bg-butter-200 disabled:opacity-50"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden />
                          {t('forceLogout')}
                        </button>
                      )}

                      {!isSelf && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(u.id, u.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE')}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold transition disabled:opacity-50',
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                          )}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <Ban className="h-3.5 w-3.5" aria-hidden />
                              {t('suspend')}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                              {t('activate')}
                            </>
                          )}
                        </button>
                      )}

                      {!isSelf && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(u.id, u.role === 'ADMIN' ? 'MAKE_USER' : 'MAKE_ADMIN')}
                          className="inline-flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1 text-xs font-extrabold text-lavender-700 transition hover:bg-lavender-200 disabled:opacity-50"
                        >
                          {u.role === 'ADMIN' ? (
                            <>
                              <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                              {t('makeUser')}
                            </>
                          ) : (
                            <>
                              <Shield className="h-3.5 w-3.5" aria-hidden />
                              {t('makeAdmin')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
