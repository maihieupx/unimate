import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { handleApiError } from '@/lib/http';
import { aiRateLimit } from '@/lib/rate-limit';
import { generateLearningPlan, type TopicStat } from '@/lib/ai';
import { localDateKey } from '@/lib/streak';
import { round } from '@/lib/utils';
import { getAppLocale } from '@/i18n/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const bodySchema = z.object({
  hoursPerDay: z.number().min(0.5).max(8).default(1.5),
  days: z.number().int().min(7).max(30).default(14),
});

/** POST /api/learning-path — Gemini builds a roadmap from the user's weak topics. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await req.json().catch(() => ({})));
    aiRateLimit(user.id);

    const [answers, documents, attempts, profile] = await Promise.all([
      prisma.attemptAnswer.findMany({
        where: { attempt: { userId: user.id, status: 'SUBMITTED' } },
        orderBy: { attempt: { submittedAt: 'desc' } },
        take: 400,
        select: { isCorrect: true, question: { select: { topic: true } } },
      }),
      prisma.document.findMany({
        where: { userId: user.id, status: 'READY' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { title: true, fileName: true, topics: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId: user.id, status: 'SUBMITTED' },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: { percent: true },
      }),
      prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timezone: true } }),
    ]);

    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const s = byTopic.get(a.question.topic) ?? { correct: 0, total: 0 };
      s.total += 1;
      if (a.isCorrect) s.correct += 1;
      byTopic.set(a.question.topic, s);
    }
    const topicStats: TopicStat[] = [...byTopic.entries()]
      .map(([topic, s]) => ({ topic, accuracy: round((s.correct / s.total) * 100, 0), answered: s.total }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 25);

    const locale = await getAppLocale();
    const plan = await generateLearningPlan({
      topicStats,
      documents: documents.map((d) => ({ title: d.title ?? d.fileName, topics: d.topics })),
      recentScores: attempts.map((a) => a.percent ?? 0),
      hoursPerDay: body.hoursPerDay,
      days: body.days,
      locale,
    });

    // Anchor day 0 at the user's local midnight (stored as UTC midnight of that date).
    const todayKey = localDateKey(new Date(), profile.timezone);
    const dayZero = Date.parse(`${todayKey}T00:00:00Z`);

    const created = await prisma.$transaction(async (tx) => {
      await tx.learningPlan.updateMany({ where: { userId: user.id, isActive: true }, data: { isActive: false } });
      return tx.learningPlan.create({
        data: {
          userId: user.id,
          title: plan.title,
          summary: plan.summary,
          weakTopics: plan.weakTopics,
          items: {
            create: plan.items
              .sort((a, b) => a.dayOffset - b.dayOffset)
              .map((item, order) => ({
                order,
                subject: item.subject,
                topic: item.topic,
                emoji: item.emoji,
                description: item.description,
                estimatedHours: item.estimatedHours,
                scheduledFor: new Date(dayZero + item.dayOffset * 86_400_000),
              })),
          },
        },
        include: { items: { orderBy: { order: 'asc' } } },
      });
    });

    return NextResponse.json({ plan: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
