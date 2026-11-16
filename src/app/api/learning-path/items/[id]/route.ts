import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { HttpError, handleApiError } from '@/lib/http';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ status: z.enum(['PENDING', 'DONE', 'SKIPPED']) });

/** PATCH /api/learning-path/items/:id — tick a roadmap task. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { status } = bodySchema.parse(await req.json());

    const result = await prisma.learningPlanItem.updateMany({
      where: { id, plan: { userId: user.id } },
      data: { status },
    });
    if (result.count === 0) throw new HttpError(404, 'NOT_FOUND');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
