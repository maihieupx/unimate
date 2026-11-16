import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { handleApiError } from '@/lib/http';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ focusViolations: z.number().int().min(0).max(10_000).default(0) });

/** POST /api/attempts/:id/abandon — explicit exit from Focus Mode without submitting. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    await prisma.quizAttempt.updateMany({
      where: { id, userId: user.id, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED', focusViolations: body.focusViolations, submittedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
