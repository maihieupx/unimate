import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from './prisma';

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

/** Don't write lastSeenAt more than once per minute per user. */
const LAST_SEEN_THROTTLE_MS = 60_000;

async function requestMeta() {
  try {
    const h = await headers();
    return {
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip'),
      userAgent: h.get('user-agent')?.slice(0, 400) ?? null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Starts a new login session and atomically invalidates every other one.
 * This is what enforces "1 user = 1 active account session".
 */
async function startLoginSession(userId: string, provider: string) {
  const meta = await requestMeta();
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.loginSession.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: now, endReason: 'REPLACED_BY_NEW_LOGIN' },
    });
    const session = await tx.loginSession.create({
      data: { userId, provider, ipAddress: meta.ip ?? null, userAgent: meta.userAgent },
    });
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        activeSessionId: session.id,
        loginCount: { increment: 1 },
        lastLoginAt: now,
        lastSeenAt: now,
      },
      select: { role: true },
    });
    return { sessionId: session.id, role: user.role };
  });
}

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        // Constant-ish time: always run bcrypt even if the user doesn't exist.
        const hash = user?.passwordHash ?? '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5Q7sX8e9Wq4o2m3n4b5v6c7x8z9a0bC';
        const valid = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !user.passwordHash || !valid) return null;
        if (user.status !== 'ACTIVE') throw new Error('AccountSuspended');

        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // Never auto-link: an e-mail that already has an account must log in with its
            // original method → NextAuth raises OAuthAccountNotLinked. (1 user = 1 account)
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { status: true },
      });
      if (existing && existing.status !== 'ACTIVE') return '/login?error=AccountSuspended';
      return true;
    },

    async jwt({ token, user, account }) {
      // Fresh sign-in → open a new login session, revoke the rest.
      if (user) {
        const { sessionId, role } = await startLoginSession(user.id, account?.provider ?? 'credentials');
        return { ...token, uid: user.id, sid: sessionId, role, revoked: false };
      }

      if (!token.uid || !token.sid || token.revoked) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: token.uid },
        select: { activeSessionId: true, status: true, role: true, lastSeenAt: true },
      });

      if (!dbUser || dbUser.activeSessionId !== token.sid || dbUser.status !== 'ACTIVE') {
        return { ...token, revoked: true };
      }

      token.role = dbUser.role;

      // Heartbeat (SessionProvider refetches every 60s) → admin "online now" view.
      const now = Date.now();
      if (!dbUser.lastSeenAt || now - dbUser.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
        const at = new Date(now);
        await prisma.$transaction([
          prisma.user.update({ where: { id: token.uid }, data: { lastSeenAt: at } }),
          prisma.loginSession.updateMany({ where: { id: token.sid, endedAt: null }, data: { lastSeenAt: at } }),
        ]);
      }
      return token;
    },

    async session({ session, token }) {
      if (token.revoked) session.error = 'SessionRevoked';
      session.user = {
        ...session.user,
        id: token.uid ?? '',
        role: token.role ?? 'USER',
      };
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.uid || !token.sid) return;
      await prisma.$transaction([
        prisma.loginSession.updateMany({
          where: { id: token.sid, endedAt: null },
          data: { endedAt: new Date(), endReason: 'SIGNED_OUT' },
        }),
        prisma.user.updateMany({
          where: { id: token.uid, activeSessionId: token.sid },
          data: { activeSessionId: null },
        }),
      ]);
    },
  },
};

export const isGoogleAuthEnabled = googleEnabled;
