import Link from 'next/link';
import { CalendarClock, Flame, Users } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/ui/Avatar';
import { isOnline } from '@/lib/utils';

export interface ScheduleTaskPreview {
  id: string;
  subject: string;
  topic: string;
  emoji: string;
  scheduledFor: Date;
  estimatedHours: number;
}

export interface FriendPreview {
  id: string;
  name: string | null;
  image: string | null;
  lastSeenAt: Date | null;
  currentStreak: number;
}

export async function ScheduleAndFriends({
  tasks,
  friends,
}: {
  tasks: ScheduleTaskPreview[];
  friends: FriendPreview[];
}) {
  const t = await getTranslations('dashboard');
  const format = await getFormatter();

  return (
    <div className="space-y-5">
      {/* Upcoming Schedule */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="card-title flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-lavender-600" aria-hidden />
            {t('scheduleTitle')}
          </h2>
          <Link href="/plan" className="text-xs font-extrabold text-lavender-700 hover:underline">
            {t('viewFullPlan')}
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-lavender-50/70 p-4 text-center text-xs font-semibold text-ink-soft">
            {t('noSchedule')}
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-2xl bg-lavender-50/60 px-3.5 py-2.5"
              >
                <span className="text-xl" aria-hidden>
                  {task.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-ink">{task.topic}</p>
                  <p className="text-[11px] font-semibold text-ink-soft">
                    {task.subject} · {format.dateTime(task.scheduledFor, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-lavender-700 shadow-sm">
                  {t('hoursShort', { hours: task.estimatedHours })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Friends & Followers */}
      <section className="card">
        <h2 className="card-title flex items-center gap-2">
          <Users className="h-5 w-5 text-peach-500" aria-hidden />
          {t('friendsTitle')}
        </h2>

        {friends.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-peach-100/40 p-4 text-center text-xs font-semibold text-ink-soft">
            {t('noFriends')}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {friends.map((friend) => {
              const online = isOnline(friend.lastSeenAt);
              return (
                <li key={friend.id} className="flex items-center gap-3">
                  <Avatar name={friend.name} image={friend.image} size="sm" online={online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">{friend.name ?? 'Learner'}</p>
                    <p className="text-[11px] font-semibold text-ink-soft">
                      {online ? t('online') : t('offline')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-peach-100 px-2.5 py-1 text-xs font-black text-peach-500">
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                    {friend.currentStreak}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
