import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { HttpError, handleApiError } from '@/lib/http';
import { aiRateLimit } from '@/lib/rate-limit';
import { DIFFICULTIES, QUESTION_TYPES, generateQuiz } from '@/lib/ai';
import { getAppLocale } from '@/i18n/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  documentId: z.string().min(1).max(64),
  numQuestions: z.number().int().min(3).max(25).default(10),
  difficulty: z.enum(DIFFICULTIES).default('MEDIUM'),
  types: z.array(z.enum(QUESTION_TYPES)).min(1).default([...QUESTION_TYPES]),
});

/**
 * POST /api/quizzes — generate a quiz from an uploaded document with Gemini.
 * Answers are stored server-side only; the response never includes them.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await req.json());
    aiRateLimit(user.id);

    const doc = await prisma.document.findFirst({
      where: { id: body.documentId, userId: user.id },
      select: { id: true, content: true, summary: true, status: true },
    });
    if (!doc) throw new HttpError(404, 'DOCUMENT_NOT_FOUND');
    if (doc.status !== 'READY') throw new HttpError(409, 'DOCUMENT_NOT_READY');

    const locale = await getAppLocale();
    const generated = await generateQuiz({
      text: doc.content,
      summary: doc.summary,
      numQuestions: body.numQuestions,
      difficulty: body.difficulty,
      types: [...new Set(body.types)],
      locale,
    });

    const quiz = await prisma.quiz.create({
      data: {
        userId: user.id,
        documentId: doc.id,
        title: generated.title,
        difficulty: body.difficulty,
        questions: {
          create: generated.questions.map((q, order) => ({
            order,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            topic: q.topic,
            difficulty: q.difficulty,
          })),
        },
      },
      select: { id: true, title: true, difficulty: true, _count: { select: { questions: true } } },
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
