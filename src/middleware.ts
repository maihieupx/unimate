import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

/**
 * Edge gate for pages. API routes authorise themselves (they need JSON 401s, not redirects).
 */
export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith('/admin') && req.nextauth.token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token?.uid) && !token?.revoked,
    },
    pages: { signIn: '/login' },
  },
);

export const config = {
  matcher: ['/((?!api|login|register|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
