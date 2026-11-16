import Link from 'next/link';
import { ArrowUpRight, BookOpenCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

const COURSES = [
  {
    key: 'geo',
    titleKey: 'courses.geoTitle',
    tagKey: 'courses.geoTag',
    descKey: 'courses.geoDesc',
    lessons: 14,
    gradient: 'from-lavender-200 via-lavender-100 to-white',
    pill: 'bg-lavender-500 text-white',
    emoji: '🌍',
  },
  {
    key: 'geom',
    titleKey: 'courses.geomTitle',
    tagKey: 'courses.geomTag',
    descKey: 'courses.geomDesc',
    lessons: 18,
    gradient: 'from-peach-200 via-peach-100 to-white',
    pill: 'bg-peach-500 text-white',
    emoji: '📐',
  },
  {
    key: 'phys',
    titleKey: 'courses.physTitle',
    tagKey: 'courses.physTag',
    descKey: 'courses.physDesc',
    lessons: 12,
    gradient: 'from-butter-200 via-butter-100 to-white',
    pill: 'bg-ink text-white',
    emoji: '⚛️',
  },
  {
    key: 'ai',
    titleKey: 'courses.aiTitle',
    tagKey: 'courses.aiTag',
    descKey: 'courses.aiDesc',
    lessons: 16,
    gradient: 'from-sky-200 via-sky-100 to-white',
    pill: 'bg-sky-600 text-white',
    emoji: '🧠',
  },
] as const;

export async function PopularCourses() {
  const t = await getTranslations('dashboard');

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="card-title">{t('popularCourses')}</h2>
        <Link
          href="/library"
          className="inline-flex items-center gap-1 rounded-full bg-lavender-100 px-3.5 py-1.5 text-xs font-extrabold text-lavender-700 transition hover:bg-lavender-200"
        >
          {t('exploreLibrary')}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="scrollbar-hide mt-4 flex snap-x gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-4">
        {COURSES.map((course) => (
          <Link
            key={course.key}
            href="/library"
            className={cn(
              'group relative flex min-w-[220px] snap-start flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-4 shadow-sm ring-1 ring-lavender-100 transition hover:-translate-y-0.5 hover:shadow-soft sm:min-w-0',
              course.gradient,
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase', course.pill)}>
                  {t(course.tagKey)}
                </span>
                <span
                  aria-hidden
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-2xl shadow-inner-3d transition group-hover:scale-110"
                >
                  {course.emoji}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-black text-ink">{t(course.titleKey)}</h3>
              <p className="mt-1 line-clamp-2 text-xs font-semibold text-ink-soft">{t(course.descKey)}</p>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-extrabold text-ink">
              <span className="inline-flex items-center gap-1 text-ink-soft">
                <BookOpenCheck className="h-3.5 w-3.5 text-lavender-600" aria-hidden />
                {t('lessonsCount', { count: course.lessons })}
              </span>
              <span className="text-lavender-700 group-hover:underline">{t('startCourse')} →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
