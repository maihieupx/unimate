'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Download, LogOut, RefreshCw } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { LanguageToggle } from './LanguageToggle';
import { cn, firstName } from '@/lib/utils';

interface TopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function Topbar({ user }: TopbarProps) {
  const t = useTranslations('topbar');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-black text-ink sm:text-3xl">
          {t('hello', { name: firstName(user.name) || t('friend') })}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-soft" suppressHydrationWarning>
          <CalendarDays className="h-4 w-4 text-lavender-500" aria-hidden />
          {format.dateTime(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <LanguageToggle />

        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-ink shadow-soft transition hover:text-lavender-600"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
          <span className="hidden sm:inline">{t('refresh')}</span>
        </button>

        <a
          href="/api/export"
          download
          className="inline-flex h-10 items-center gap-2 rounded-full bg-lavender-600 px-4 text-sm font-bold text-white shadow-float transition hover:bg-lavender-700"
        >
          <Download className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t('export')}</span>
        </a>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('profile')}
            className="rounded-full transition hover:scale-105"
          >
            <Avatar name={user.name} image={user.image} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-60 rounded-2xl bg-white p-2 shadow-float"
              >
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-extrabold text-ink">{user.name}</p>
                  <p className="truncate text-xs text-ink-soft">{user.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink transition hover:bg-peach-100 hover:text-peach-500"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {t('signOut')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
