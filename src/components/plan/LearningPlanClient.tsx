'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, Clock, Loader2, Route, Sparkles } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PlanItemStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

export interface FullPlanItem {
  id: string;
  subject: string;
  topic: string;
  emoji: string;
  description: string;
  estimatedHours: number;
  scheduledFor: string;
  status: PlanItemStatus;
}

export interface FullPlan {
  id: string;
  title: string;
  summary: string;
  weakTopics: string[];
  items: FullPlanItem[];
}

export function LearningPlanClient({ initialPlan }: { initialPlan: FullPlan | null }) {
  const t = useTranslations('plan');
  const format = useFormatter();
  const router = useRouter();

  const [plan, setPlan] = useState<FullPlan | null>(initialPlan);
  const [hoursPerDay, setHoursPerDay] = useState(1.5);
  const [days, setDays] = useState(14);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursPerDay, days }),
      });
      const data = (await res.json().catch(() => ({}))) as { plan?: FullPlan; message?: string; error?: string };
      if (!res.ok || !data.plan) {
        throw new Error(data.message ?? data.error ?? 'Failed');
      }
      setPlan(data.plan);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setGenerating(false);
    }
  };

  const toggleStatus = async (item: FullPlanItem) => {
    if (!plan) return;
    const nextStatus: PlanItemStatus = item.status === 'DONE' ? 'PENDING' : 'DONE';
    setPlan({
      ...plan,
      items: plan.items.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)),
    });
    const res = await fetch(`/api/learning-path/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setPlan({
        ...plan,
        items: plan.items.map((it) => (it.id === item.id ? { ...it, status: item.status } : it)),
      });
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm font-semibold text-ink-soft">{t('subtitle')}</p>
      </div>

      {/* Generator controls */}
      <section className="card">
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-extrabold text-ink-soft">{t('hoursPerDay')}</label>
            <input
              type="number"
              min={0.5}
              max={8}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-ink-soft">{t('daysHorizon')}</label>
            <input
              type="number"
              min={7}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="input mt-1.5"
            />
          </div>
          <button type="button" onClick={() => void handleGenerate()} disabled={generating} className="btn-primary py-3">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {generating ? t('generating') : t('generate')}
          </button>
        </div>
        {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}
      </section>

      {/* Active Roadmap */}
      {!plan ? (
        <section className="card py-12 text-center">
          <Route className="mx-auto h-10 w-10 text-lavender-400" aria-hidden />
          <h2 className="mt-3 text-lg font-black text-ink">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-ink-soft">{t('emptyBody')}</p>
        </section>
      ) : (
        <section className="card space-y-5">
          <div>
            <h2 className="text-xl font-black text-ink">{plan.title}</h2>
            <p className="mt-1 text-sm font-semibold text-ink-soft">{plan.summary}</p>
            {plan.weakTopics.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-ink-soft">{t('weakTopics')}:</span>
                {plan.weakTopics.map((topic) => (
                  <span key={topic} className="rounded-full bg-peach-100 px-3 py-1 text-xs font-extrabold text-peach-500">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <ul className="space-y-3">
            {plan.items.map((item) => {
              const done = item.status === 'DONE';
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-col justify-between gap-3 rounded-2xl border border-lavender-100 bg-lavender-50/40 p-4 sm:flex-row sm:items-center',
                    done && 'opacity-70',
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-inner-3d">
                      {item.emoji}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-lavender-100 px-2.5 py-0.5 text-[11px] font-extrabold text-lavender-700">
                          {item.subject}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-soft">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          {format.dateTime(new Date(item.scheduledFor), { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-peach-500">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {t('hoursEst', { hours: item.estimatedHours })}
                        </span>
                      </div>
                      <h3 className={cn('mt-1 text-sm font-black text-ink', done && 'line-through')}>{item.topic}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-ink-soft">{item.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void toggleStatus(item)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition',
                      done
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-white text-lavender-700 shadow-sm hover:bg-lavender-100',
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    {done ? t('markPending') : t('markDone')}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
