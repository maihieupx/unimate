import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { HttpError, handleApiError } from '@/lib/http';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  action: z.enum(['SUSPEND', 'ACTIVATE', 'FORCE_LOGOUT', 'MAKE_ADMIN', 'MAKE_USER']),
});

/** PATCH /api/admin/users/:id — access management. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action } = bodySchema.parse(await req.json());

    if (id === admin.id && action !== 'ACTIVATE') throw new HttpError(400, 'CANNOT_MODIFY_SELF');

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new HttpError(404, 'USER_NOT_FOUND');

    const endSessions = (reason: string) =>
      prisma.loginSession.updateMany({
        where: { userId: id, endedAt: null },
        data: { endedAt: new Date(), endReason: reason },
      });

    switch (action) {
      case 'SUSPEND':
        await prisma.$transaction([
          prisma.user.update({ where: { id }, data: { status: 'SUSPENDED', activeSessionId: null } }),
          endSessions('SUSPENDED'),
        ]);
        break;
      case 'ACTIVATE':
        await prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
        break;
      case 'FORCE_LOGOUT':
        // Clearing activeSessionId invalidates the JWT on its next check (≤ 60s heartbeat).
        await prisma.$transaction([
          prisma.user.update({ where: { id }, data: { activeSessionId: null } }),
          endSessions('FORCED_BY_ADMIN'),
        ]);
        break;
      case 'MAKE_ADMIN':
        await prisma.user.update({ where: { id }, data: { role: 'ADMIN' } });
        break;
      case 'MAKE_USER':
        await prisma.user.update({ where: { id }, data: { role: 'USER' } });
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
