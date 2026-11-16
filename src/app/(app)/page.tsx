import { getFormatter } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/lib/session';
import { displayStreak, lastNDays, localDateKey } from '@/lib/streak';
import { ProgressChart, type DailyProgressPoint } from '@/components/dashboard/ProgressChart';
import { PersonalLearningPlanCard, type PlanItemPreview } from '@/components/dashboard/PersonalLearningPlanCard';
import { PopularCourses } from '@/components/dashboard/PopularCourses';
import { MascotWidget } from '@/components/dashboard/MascotWidget';
import { ScheduleAndFriends } from '@/components/dashboard/ScheduleAndFriends';
import { DEFAULT_TIME_ZONE } from '@/i18n/config';

export const dynamic = 'force-dynamic';

const SAMPLE_PLAN_ITEMS: PlanItemPreview[] = [
  { id: 'sample-geo', subject: 'Geography', topic: 'Plate Tectonics & Climate', emoji: '🌍', estimatedHours: 1.5, status: 'PENDING', isSample: true },
  { id: 'sample-geom', subject: 'Geometry', topic: '3D Solids & Cross Sections', emoji: '📐', estimatedHours: 2, status: 'PENDING', isSample: true },
  { id: 'sample-phys', subject: 'Physics', topic: 'Energy & Relativity (E=mc²)', emoji: '⚛️', estimatedHours: 1, status: 'PENDING', isSample: true },
];

export default async function DashboardPage() {
  const sessionUser = await requirePageUser();
  const format = await getFormatter();

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { timezone: true, streak: true },
  });
  const timeZone = dbUser?.timezone ?? DEFAULT_TIME_ZONE;
  const todayKey = localDateKey(new Date(), timeZone);
  const dayKeys = lastNDays(todayKey, 7);

  const [activities, activePlan, latestQuiz, follows, community] = await Promise.all([
    prisma.studyActivity.findMany({
      where: { userId: sessionUser.id, date: { in: dayKeys } },
    }),
    prisma.learningPlan.findFirst({
      where: { userId: sessionUser.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { order: 'asc' }, take: 8 } },
    }),
    prisma.quiz.findFirst({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
    prisma.follow.findMany({
      where: { followerId: sessionUser.id },
      take: 5,
      select: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            lastSeenAt: true,
            streak: { select: { currentStreak: true, lastActiveDate: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { id: { not: sessionUser.id }, status: 'ACTIVE' },
      orderBy: { lastSeenAt: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        image: true,
        lastSeenAt: true,
        streak: { select: { currentStreak: true, lastActiveDate: true } },
      },
    }),
  ]);

  const byDate = new Map(activities.map((a) => [a.date, a]));
  const progressDays: DailyProgressPoint[] = dayKeys.map((date) => {
    const row = byDate.get(date);
    return {
      date,
      label: format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: 'short' }),
      avgScore: row?.avgScore ?? null,
      qualityScore: row?.qualityScore ?? null,
      quizzesCompleted: row?.quizzesCompleted ?? 0,
      minutes: row?.minutes ?? 0,
    };
  });

  const currentStreak = displayStreak(dbUser?.streak ?? null, timeZone);
  const longestStreak = dbUser?.streak?.longestStreak ?? 0;
  const freezeTokens = dbUser?.streak?.freezeTokens ?? 0;

  const planItems: PlanItemPreview[] =
    activePlan && activePlan.items.length > 0
      ? activePlan.items.slice(0, 4).map((it) => ({
          id: it.id,
          subject: it.subject,
          topic: it.topic,
          emoji: it.emoji,
          estimatedHours: it.estimatedHours,
          status: it.status,
        }))
      : SAMPLE_PLAN_ITEMS;

  const upcomingTasks = (activePlan?.items ?? [])
    .filter((it) => it.status === 'PENDING')
    .slice(0, 3)
    .map((it) => ({
      id: it.id,
      subject: it.subject,
      topic: it.topic,
      emoji: it.emoji,
      scheduledFor: it.scheduledFor,
      estimatedHours: it.estimatedHours,
    }));

  const friendUsers = follows.length > 0 ? follows.map((f) => f.following) : community;
  const friends = friendUsers.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    lastSeenAt: u.lastSeenAt,
    currentStreak: displayStreak(u.streak, timeZone),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left / Main 8 columns */}
      <div className="space-y-6 lg:col-span-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <ProgressChart
              days={progressDays}
              currentStreak={currentStreak}
              longestStreak={longestStreak}
              freezeTokens={freezeTokens}
            />
          </div>
          <div className="xl:col-span-5">
            <PersonalLearningPlanCard
              planTitle={activePlan?.title}
              items={planItems}
              isSample={!activePlan || activePlan.items.length === 0}
            />
          </div>
        </div>

        <PopularCourses />
      </div>

      {/* Right 4 columns: Gamified Mascot + Schedule & Friends */}
      <div className="space-y-6 lg:col-span-4">
        <MascotWidget
          userName={sessionUser.name}
          currentStreak={currentStreak}
          latestQuizId={latestQuiz?.id}
        />
        <ScheduleAndFriends tasks={upcomingTasks} friends={friends} />
      </div>
    </div>
  );
}
