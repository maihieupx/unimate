import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { HttpError, handleApiError } from '@/lib/http';
import { gradeWithAI, normalizeAnswer, type GradingItem, type GradingResult } from '@/lib/ai';
import { recordStudyActivity } from '@/lib/streak';
import { round } from '@/lib/utils';
import { getAppLocale } from '@/i18n/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const bodySchema = z.object({
  answers: z.record(z.string(), z.string().max(5000)),
  focusViolations: z.number().int().min(0).max(10_000),
});

/** Partial credit ≥ 60% counts as "correct" for streak/quality purposes. */
const SHORT_ANSWER_PASS = 0.6;

/** POST /api/attempts/:id/submit — grade (objective + Gemini) and update streak. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id, userId: user.id },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        user: { select: { timezone: true } },
      },
    });
    if (!attempt) throw new HttpError(404, 'ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'IN_PROGRESS') throw new HttpError(409, 'ATTEMPT_CLOSED');

    const questions = attempt.quiz.questions;
    const items: GradingItem[] = questions.map((q) => {
      const response = (body.answers[q.id] ?? '').trim();
      return {
        questionId: q.id,
        type: q.type,
        prompt: q.prompt,
        correctAnswer: q.correctAnswer,
        response,
        topic: q.topic,
        isCorrect:
          q.type === 'SHORT_ANSWER' ? undefined : response !== '' && normalizeAnswer(response) === normalizeAnswer(q.correctAnswer),
      };
    });

    // AI grading runs outside the DB transaction (slow network call).
    const locale = await getAppLocale();
    let feedback: GradingResult;
    try {
      feedback = await gradeWithAI(items, body.focusViolations, locale);
    } catch (error) {
      console.warn('[submit] AI grading failed, falling back to exact matching', error);
      feedback = { shortAnswers: [], overallFeedback: '', strengths: [], weakTopics: [], recommendations: [] };
    }
    const aiShort = new Map(feedback.shortAnswers.map((s) => [s.questionId, s]));

    const graded = questions.map((q, i) => {
      const item = items[i];
      if (q.type === 'SHORT_ANSWER') {
        const ai = aiShort.get(q.id);
        const score = item.response
          ? (ai?.score ?? (normalizeAnswer(item.response) === normalizeAnswer(q.correctAnswer) ? 1 : 0))
          : 0;
        return {
          question: q,
          response: item.response,
          isCorrect: score >= SHORT_ANSWER_PASS,
          pointsAwarded: round(score * q.points, 2),
          feedback: ai?.feedback ?? null,
        };
      }
      return {
        question: q,
        response: item.response,
        isCorrect: Boolean(item.isCorrect),
        pointsAwarded: item.isCorrect ? q.points : 0,
        feedback: null,
      };
    });

    const maxScore = questions.reduce((s, q) => s + q.points, 0);
    const score = round(graded.reduce((s, g) => s + g.pointsAwarded, 0), 2);
    const percent = maxScore > 0 ? round((score / maxScore) * 100, 1) : 0;
    const timeSpentSec = Math.max(1, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));

    const aiFeedback = {
      overallFeedback: feedback.overallFeedback,
      strengths: feedback.strengths,
      weakTopics: feedback.weakTopics,
      recommendations: feedback.recommendations,
    };

    const streak = await prisma.$transaction(async (tx) => {
      // Guard against double submission (two tabs / double click).
      const closed = await tx.quizAttempt.updateMany({
        where: { id, status: 'IN_PROGRESS' },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          score,
          maxScore,
          percent,
          timeSpentSec,
          focusViolations: body.focusViolations,
          aiFeedback,
        },
      });
      if (closed.count !== 1) throw new HttpError(409, 'ATTEMPT_CLOSED');

      await tx.attemptAnswer.createMany({
        data: graded.map((g) => ({
          attemptId: id,
          questionId: g.question.id,
          response: g.response,
          isCorrect: g.isCorrect,
          pointsAwarded: g.pointsAwarded,
          feedback: g.feedback,
        })),
      });

      return recordStudyActivity(tx, {
        userId: user.id,
        timeZone: attempt.user.timezone,
        minutes: Math.max(1, Math.round(timeSpentSec / 60)),
        scorePercent: percent,
        focusViolations: body.focusViolations,
      });
    });

    return NextResponse.json({
      result: {
        attemptId: id,
        score,
        maxScore,
        percent,
        timeSpentSec,
        focusViolations: body.focusViolations,
        feedback: aiFeedback,
        streak: { current: streak.currentStreak, longest: streak.longestStreak },
        answers: graded.map((g) => ({
          questionId: g.question.id,
          type: g.question.type,
          prompt: g.question.prompt,
          response: g.response,
          correctAnswer: g.question.correctAnswer,
          explanation: g.question.explanation,
          isCorrect: g.isCorrect,
          pointsAwarded: g.pointsAwarded,
          points: g.question.points,
          feedback: g.feedback,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
