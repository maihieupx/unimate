'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';

/** Signs the user out locally when their session was replaced by a login elsewhere or revoked by an admin. */
function SessionGuard() {
  const { data } = useSession();
  useEffect(() => {
    if (data?.error === 'SessionRevoked') {
      void signOut({ callbackUrl: '/login?error=SessionRevoked' });
    }
  }, [data?.error]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    // 60s refetch doubles as the presence heartbeat for the admin "online now" view.
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionGuard />
      {children}
    </SessionProvider>
  );
}
