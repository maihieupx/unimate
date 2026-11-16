import { Activity, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { requirePageAdmin } from '@/lib/session';
import { ONLINE_WINDOW_MS } from '@/lib/utils';
import { AdminUserTable } from '@/components/admin/AdminUserTable';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await requirePageAdmin();
  const t = await getTranslations('admin');
  const format = await getFormatter();
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS);

  const [users, totalLoginsAgg, activeSessionsCount, onlineUsersCount, recentSessions] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        loginCount: true,
        lastLoginAt: true,
        lastSeenAt: true,
        activeSessionId: true,
      },
      take: 150,
    }),
    prisma.user.aggregate({ _sum: { loginCount: true } }),
    prisma.loginSession.count({ where: { endedAt: null } }),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        activeSessionId: { not: null },
        lastSeenAt: { gte: onlineCutoff },
      },
    }),
    prisma.loginSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const kpis = [
    { label: t('totalUsers'), value: users.length, icon: Users, tone: 'bg-lavender-100 text-lavender-700' },
    { label: t('onlineNow'), value: onlineUsersCount, icon: Activity, tone: 'bg-emerald-100 text-emerald-700' },
    { label: t('totalLogins'), value: totalLoginsAgg._sum.loginCount ?? 0, icon: KeyRound, tone: 'bg-peach-100 text-peach-500' },
    { label: t('activeSessions'), value: activeSessionsCount, icon: ShieldCheck, tone: 'bg-butter-100 text-ink' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm font-semibold text-ink-soft">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-inner-3d ${tone}`}>
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-soft">{label}</p>
              <p className="text-2xl font-black text-ink">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <AdminUserTable
        currentAdminId={admin.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          role: u.role,
          status: u.status,
          loginCount: u.loginCount,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
          hasActiveSession: Boolean(u.activeSessionId),
        }))}
      />

      <section className="card">
        <h2 className="card-title">{t('recentSessionsTitle')}</h2>
        <div className="mt-4 space-y-2.5">
          {recentSessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lavender-50/60 px-4 py-3 text-xs"
            >
              <div>
                <p className="font-extrabold text-ink">
                  {s.user.name ?? s.user.email} <span className="font-semibold text-ink-soft">({s.user.email})</span>
                </p>
                <p className="mt-0.5 font-semibold text-ink-soft">
                  {t('provider')}: {s.provider} · {t('ipAddress')}: {s.ipAddress ?? '—'} ·{' '}
                  {format.dateTime(s.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <span
                className={
                  s.endedAt === null
                    ? 'rounded-full bg-emerald-100 px-3 py-1 font-extrabold text-emerald-700'
                    : 'rounded-full bg-white px-3 py-1 font-bold text-ink-soft'
                }
              >
                {s.endedAt === null ? t('sessionActive') : t('sessionEnded', { reason: s.endReason ?? 'ENDED' })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
