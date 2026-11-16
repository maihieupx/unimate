'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Clock, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface PlanItemPreview {
  id: string;
  subject: string;
  topic: string;
  emoji: string;
  estimatedHours: number;
  status: 'PENDING' | 'DONE' | 'SKIPPED';
  isSample?: boolean;
}

const TILE_BACKGROUNDS = [
  'bg-lavender-100 text-lavender-700',
  'bg-peach-100 text-peach-500',
  'bg-butter-100 text-ink',
  'bg-sky-100 text-sky-700',
];

interface PersonalLearningPlanCardProps {
  planTitle?: string | null;
  items: PlanItemPreview[];
  isSample: boolean;
}

export function PersonalLearningPlanCard({ planTitle, items, isSample }: PersonalLearningPlanCardProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [localItems, setLocalItems] = useState(items);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleItem = async (item: PlanItemPreview) => {
    if (item.isSample) return;
    const nextStatus = item.status === 'DONE' ? 'PENDING' : 'DONE';
    setLocalItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    const res = await fetch(`/api/learning-path/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setLocalItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: item.status } : it)));
      return;
    }
    startTransition(() => router.refresh());
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursPerDay: 1.5, days: 14 }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(payload.message ?? payload.error ?? 'Failed');
      }
      const data = (await res.json()) as {
        plan: { items: PlanItemPreview[] };
      };
      setLocalItems(data.plan.items.slice(0, 4));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="card flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-2.5 py-0.5 text-[11px] font-extrabold text-lavender-700">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t('createdByAi')}
            </div>
            <h2 className="card-title mt-1.5">{t('personalPlanTitle')}</h2>
            {planTitle && <p className="mt-0.5 text-xs font-semibold text-ink-soft">{planTitle}</p>}
          </div>

          {isSample && (
            <span className="rounded-full bg-butter-200 px-2.5 py-1 text-[11px] font-extrabold text-ink">
              {t('sampleBadge')}
            </span>
          )}
        </div>

        <ul className="mt-4 space-y-2.5">
          {localItems.map((item, idx) => {
            const done = item.status === 'DONE';
            return (
              <li
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border border-lavender-100 bg-lavender-50/40 p-3 transition hover:bg-lavender-50',
                  done && 'opacity-70',
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    'grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl shadow-inner-3d',
                    TILE_BACKGROUNDS[idx % TILE_BACKGROUNDS.length],
                  )}
                >
                  {item.emoji}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-extrabold text-ink', done && 'line-through')}>
                    {item.subject}
                  </p>
                  <p className="truncate text-xs font-semibold text-ink-soft">{item.topic}</p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-peach-500" aria-hidden />
                  {t('hoursShort', { hours: item.estimatedHours })}
                </span>

                {!item.isSample && (
                  <button
                    type="button"
                    onClick={() => void toggleItem(item)}
                    aria-label={item.topic}
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition',
                      done
                        ? 'border-emerald-400 bg-emerald-400 text-white'
                        : 'border-lavender-200 bg-white text-transparent hover:border-lavender-400',
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {isSample && <p className="mt-3 text-xs font-semibold text-ink-soft">{t('planEmptyHint')}</p>}
        {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={generating}
          className="btn-soft"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {generating ? t('generatingPlan') : t('regeneratePlan')}
        </button>
        <Link
          href="/plan"
          className="inline-flex items-center gap-1 text-xs font-extrabold text-lavender-700 transition hover:text-lavender-600"
        >
          {t('viewFullPlan')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
