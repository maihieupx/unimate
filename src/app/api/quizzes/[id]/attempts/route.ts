import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { HttpError, handleApiError } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** POST /api/quizzes/:id/attempts — start a timed attempt (entering Focus Mode). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const quiz = await prisma.quiz.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!quiz) throw new HttpError(404, 'QUIZ_NOT_FOUND');

    // Any dangling attempt on this quiz is considered abandoned.
    await prisma.quizAttempt.updateMany({
      where: { quizId: id, userId: user.id, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const attempt = await prisma.quizAttempt.create({
      data: { quizId: id, userId: user.id },
      select: { id: true, startedAt: true },
    });

    return NextResponse.json({ attemptId: attempt.id, startedAt: attempt.startedAt }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
