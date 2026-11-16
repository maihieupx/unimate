'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Loader2,
  Maximize2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Difficulty, QuestionType } from '@prisma/client';
import { FocusMode, useFocusMode } from '@/components/focus/FocusMode';
import { cn } from '@/lib/utils';

export interface QuizQuestionClient {
  id: string;
  order: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  topic: string;
  points: number;
}

interface GradedAnswer {
  questionId: string;
  type: QuestionType;
  prompt: string;
  response: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  pointsAwarded: number;
  points: number;
  feedback: string | null;
}

interface QuizResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  timeSpentSec: number;
  focusViolations: number;
  feedback: {
    overallFeedback: string;
    strengths: string[];
    weakTopics: string[];
    recommendations: string[];
  };
  streak: { current: number; longest: number };
  answers: GradedAnswer[];
}

interface QuizRunnerProps {
  quiz: {
    id: string;
    title: string;
    difficulty: Difficulty;
    documentTitle: string | null;
    questions: QuizQuestionClient[];
  };
}

export function QuizRunner({ quiz }: QuizRunnerProps) {
  const t = useTranslations('quiz');
  const router = useRouter();
  const focus = useFocusMode();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { attemptId?: string; error?: string };
      if (!res.ok || !data.attemptId) {
        throw new Error(data.error ?? 'Failed to start');
      }
      setAttemptId(data.attemptId);
      setAnswers({});
      setResult(null);
      await focus.enter();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Error');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) throw new Error('Missing attempt');
    const res = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        focusViolations: focus.violationCount,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { result?: QuizResult; message?: string; error?: string };
    if (!res.ok || !data.result) {
      throw new Error(data.message ?? data.error ?? 'Submit failed');
    }
    setResult(data.result);
    router.refresh();
  };

  const handleAbandon = async () => {
    if (attemptId) {
      await fetch(`/api/attempts/${attemptId}/abandon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusViolations: focus.violationCount }),
      }).catch(() => undefined);
    }
    setAttemptId(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/library" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-lavender-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('backToLibrary')}
      </Link>

      {/* Pre-start card */}
      {!result && (
        <section className="card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1 text-xs font-extrabold text-lavender-700">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {t('readyBadge')}
            </span>
            <span className="rounded-full bg-butter-100 px-3 py-1 text-xs font-extrabold text-ink">
              {t('questionsCount', { count: quiz.questions.length })}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-ink">{quiz.title}</h1>
            {quiz.documentTitle && <p className="mt-1 text-sm font-semibold text-ink-soft">{quiz.documentTitle}</p>}
          </div>

          <div className="rounded-2xl bg-peach-100/60 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-ink">
              <AlertTriangle className="h-4 w-4 text-peach-500" aria-hidden />
              {t('rulesTitle')}
            </h2>
            <ul className="mt-2.5 space-y-1.5 text-xs font-semibold text-ink-soft">
              <li>• {t('rule1')}</li>
              <li>• {t('rule2')}</li>
              <li>• {t('rule3')}</li>
            </ul>
          </div>

          {startError && <p className="text-xs font-bold text-rose-600">{startError}</p>}

          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="btn-primary w-full py-3.5 text-base"
          >
            {starting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Maximize2 className="h-5 w-5" aria-hidden />}
            {starting ? t('starting') : t('startButton')}
          </button>
        </section>
      )}

      {/* Results View after Focus Mode submission */}
      {result && (
        <div className="space-y-6">
          <section className="card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="flex items-center gap-2 text-2xl font-black text-ink">
                <Sparkles className="h-6 w-6 text-lavender-600" aria-hidden />
                {t('resultTitle')}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-peach-100 px-3.5 py-1.5 text-xs font-black text-peach-500">
                <Flame className="h-4 w-4" aria-hidden />
                {t('streakUpdated', { current: result.streak.current, longest: result.streak.longest })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-lavender-50 p-4 text-center">
                <p className="text-xs font-bold text-ink-soft">{t('scoreLabel')}</p>
                <p className="mt-1 text-2xl font-black text-lavender-700">{result.percent}%</p>
                <p className="text-[11px] font-bold text-ink-muted">
                  {result.score} / {result.maxScore}
                </p>
              </div>
              <div className="rounded-2xl bg-butter-100 p-4 text-center">
                <p className="text-xs font-bold text-ink-soft">{t('timeSpent')}</p>
                <p className="mt-1 text-2xl font-black text-ink">{result.timeSpentSec}s</p>
              </div>
              <div className="rounded-2xl bg-peach-100/70 p-4 text-center">
                <p className="text-xs font-bold text-ink-soft">{t('violationsCount')}</p>
                <p className="mt-1 text-2xl font-black text-peach-500">{result.focusViolations}</p>
              </div>
            </div>

            {result.feedback.overallFeedback && (
              <div className="rounded-2xl bg-lavender-50/70 p-4">
                <h2 className="text-xs font-black uppercase tracking-wide text-lavender-700">{t('overallFeedback')}</h2>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-ink">{result.feedback.overallFeedback}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {result.feedback.strengths.length > 0 && (
                <div className="rounded-2xl bg-emerald-50/80 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-emerald-700">{t('strengths')}</h3>
                  <ul className="mt-2 space-y-1 text-xs font-bold text-ink">
                    {result.feedback.strengths.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.feedback.weakTopics.length > 0 && (
                <div className="rounded-2xl bg-rose-50/80 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-rose-600">{t('weakTopics')}</h3>
                  <ul className="mt-2 space-y-1 text-xs font-bold text-ink">
                    {result.feedback.weakTopics.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result.feedback.recommendations.length > 0 && (
              <div className="rounded-2xl bg-butter-100/70 p-4">
                <h3 className="text-xs font-black uppercase tracking-wide text-ink">{t('recommendations')}</h3>
                <ul className="mt-2 space-y-1 text-xs font-bold text-ink-soft">
                  {result.feedback.recommendations.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link href="/plan" className="btn-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
                {t('buildPlanFromResults')}
              </Link>
              <button type="button" onClick={() => void handleStart()} className="btn-soft">
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t('retryQuiz')}
              </button>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="card-title">{t('questionReview')}</h2>
            {result.answers.map((ans, idx) => (
              <div key={ans.questionId} className="rounded-2xl border border-lavender-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-extrabold text-ink">
                    {idx + 1}. {ans.prompt}
                  </p>
                  {ans.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500" aria-hidden />
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-ink-soft">
                    <span className="font-extrabold text-ink">{t('yourAnswer')}:</span>{' '}
                    {ans.response || t('noAnswer')}
                  </p>
                  <p className="font-semibold text-emerald-700">
                    <span className="font-extrabold">{t('correctAnswer')}:</span> {ans.correctAnswer}
                  </p>
                  {ans.explanation && (
                    <p className="font-semibold text-ink-soft">
                      <span className="font-extrabold text-ink">{t('explanation')}:</span> {ans.explanation}
                    </p>
                  )}
                  {ans.feedback && (
                    <p className="rounded-xl bg-lavender-50 px-3 py-2 font-bold text-lavender-700">
                      {t('aiNote')}: {ans.feedback}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Strict Focus Mode Overlay */}
      <FocusMode
        focus={focus}
        title={quiz.title}
        subtitle={quiz.documentTitle ?? undefined}
        onSubmit={handleSubmit}
        onAbandon={handleAbandon}
      >
        <div className="space-y-5 pb-10">
          {quiz.questions.map((q, idx) => {
            const value = answers[q.id] ?? '';
            return (
              <article key={q.id} className="card">
                <div className="flex items-center justify-between text-xs font-extrabold text-lavender-700">
                  <span>{t('questionIndex', { current: idx + 1, total: quiz.questions.length })}</span>
                  <span className="rounded-full bg-lavender-100 px-2.5 py-0.5">{q.topic}</span>
                </div>

                <h2 className="mt-2 text-base font-black text-ink">{q.prompt}</h2>

                {q.type === 'MULTIPLE_CHOICE' && (
                  <div className="mt-4 space-y-2">
                    {q.options.map((opt) => {
                      const checked = value === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition',
                            checked
                              ? 'border-lavender-500 bg-lavender-100 text-lavender-700'
                              : 'border-lavender-100 bg-white text-ink hover:border-lavender-300',
                          )}
                        >
                          <span
                            className={cn(
                              'h-4 w-4 shrink-0 rounded-full border-2',
                              checked ? 'border-lavender-600 bg-lavender-600' : 'border-lavender-300',
                            )}
                          />
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === 'TRUE_FALSE' && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(['true', 'false'] as const).map((boolOpt) => {
                      const checked = value === boolOpt;
                      return (
                        <button
                          key={boolOpt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: boolOpt }))}
                          className={cn(
                            'rounded-2xl border-2 px-4 py-3 text-sm font-extrabold transition',
                            checked
                              ? 'border-lavender-500 bg-lavender-100 text-lavender-700'
                              : 'border-lavender-100 bg-white text-ink hover:border-lavender-300',
                          )}
                        >
                          {boolOpt === 'true' ? t('trueLabel') : t('falseLabel')}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === 'SHORT_ANSWER' && (
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={t('shortAnswerPlaceholder')}
                    className="input mt-4 resize-y"
                  />
                )}
              </article>
            );
          })}
        </div>
      </FocusMode>
    </div>
  );
}
