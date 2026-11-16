import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'WEAK_PASSWORD')
    .regex(/\d/, 'WEAK_PASSWORD'),
});

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** POST /api/register — strict one account per e-mail. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);

    const body = bodySchema.parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (exists) throw new HttpError(409, 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: adminEmails.has(body.email) ? 'ADMIN' : 'USER',
        streak: { create: {} },
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // Unique violation from a concurrent registration race.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'EMAIL_TAKEN' }, { status: 409 });
    }
    return handleApiError(error);
  }
}
