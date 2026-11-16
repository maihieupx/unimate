'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Flame, Shield, Sparkles, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface DailyProgressPoint {
  date: string;
  label: string;
  avgScore: number | null;
  qualityScore: number | null;
  quizzesCompleted: number;
  minutes: number;
}

interface ProgressChartProps {
  days: DailyProgressPoint[];
  currentStreak: number;
  longestStreak: number;
  freezeTokens: number;
}

export function ProgressChart({ days, currentStreak, longestStreak, freezeTokens }: ProgressChartProps) {
  const t = useTranslations('dashboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalQuizzes = days.reduce((s, d) => s + d.quizzesCompleted, 0);
  const scoredDays = days.filter((d) => d.avgScore !== null);
  const avgScore =
    scoredDays.length > 0
      ? Math.round(scoredDays.reduce((s, d) => s + (d.avgScore ?? 0), 0) / scoredDays.length)
      : 0;
  const avgQuality =
    scoredDays.length > 0
      ? Math.round(scoredDays.reduce((s, d) => s + (d.qualityScore ?? 0), 0) / scoredDays.length)
      : 0;

  const chartData = days.map((d) => ({
    label: d.label,
    score: d.avgScore ?? 0,
    quality: d.qualityScore ?? 0,
    completed: d.quizzesCompleted,
  }));

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="card-title">{t('learningProgress')}</h2>
          <p className="mt-0.5 text-xs font-semibold text-ink-soft">{t('progressSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-peach-100 px-3.5 py-2">
            <Flame className="h-5 w-5 animate-flicker text-peach-500" aria-hidden />
            <div>
              <p className="text-xs font-extrabold text-ink">{t('streakDays', { count: currentStreak })}</p>
              <p className="text-[11px] font-semibold text-ink-soft">{t('longestStreak', { count: longestStreak })}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl bg-butter-100 px-3 py-2 text-xs font-bold text-ink">
            <Shield className="h-4 w-4 text-lavender-600" aria-hidden />
            <span>{t('freezeTokens', { count: freezeTokens })}</span>
          </div>
        </div>
      </div>

      {/* Quick KPI pills */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-lavender-50 px-3.5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('avgScore')}</p>
          <p className="mt-0.5 text-xl font-black text-lavender-700">{avgScore}%</p>
        </div>
        <div className="rounded-2xl bg-peach-100/70 px-3.5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('avgQuality')}</p>
          <p className="mt-0.5 text-xl font-black text-peach-500">{avgQuality}%</p>
        </div>
        <div className="rounded-2xl bg-butter-100/80 px-3.5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('quizzesDone')}</p>
          <p className="mt-0.5 text-xl font-black text-ink">{totalQuizzes}</p>
        </div>
      </div>

      {/* Area Chart with pastel lavender & peach gradients */}
      <div className="mt-5 h-56 w-full">
        {!mounted ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-lavender-50" />
        ) : totalQuizzes === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-lavender-200 bg-lavender-50/40 px-4 text-center">
            <Trophy className="h-8 w-8 text-lavender-400" aria-hidden />
            <p className="mt-2 max-w-xs text-sm font-bold text-ink-soft">{t('noProgressYet')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B74DB" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#8B74DB" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="qualityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9E6B" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#FF9E6B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#EFEBFA" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B6588', fontSize: 12, fontWeight: 700 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A19CB8', fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: 'none',
                  boxShadow: '0 12px 30px -12px rgba(114, 89, 199, 0.35)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                name={t('scoreSeries')}
                stroke="#7259C7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#scoreGrad)"
              />
              <Area
                type="monotone"
                dataKey="quality"
                name={t('qualitySeries')}
                stroke="#F7834A"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                fillOpacity={1}
                fill="url(#qualityGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Continuous 7-day completion quality chain */}
      <div className="mt-5 rounded-2xl bg-lavender-50/70 p-3.5">
        <div className="mb-2.5 flex items-center justify-between text-xs font-extrabold text-ink">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-lavender-600" aria-hidden />
            {t('qualityChain')}
          </span>
          <span className="text-ink-soft">
            {days.filter((d) => d.quizzesCompleted > 0).length} / {days.length}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const done = day.quizzesCompleted > 0;
            const q = Math.round(day.qualityScore ?? 0);
            return (
              <div
                key={day.date}
                title={`${day.label}: ${done ? `${q}%` : t('chainMissed')}`}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    'flex h-9 w-full items-center justify-center rounded-xl text-[11px] font-black transition',
                    done
                      ? q >= 80
                        ? 'bg-lavender-500 text-white shadow-inner-3d'
                        : 'bg-peach-300 text-ink shadow-inner-3d'
                      : 'border border-dashed border-lavender-200 bg-white text-ink-muted',
                  )}
                >
                  {done ? `${q}%` : '·'}
                </div>
                <span className="text-[10px] font-bold text-ink-soft">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
