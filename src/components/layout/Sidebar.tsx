'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { BookOpen, LayoutGrid, LogOut, Route, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  key: 'home' | 'library' | 'plan' | 'admin';
  icon: LucideIcon;
}

const BASE_ITEMS: NavItem[] = [
  { href: '/', key: 'home', icon: LayoutGrid },
  { href: '/library', key: 'library', icon: BookOpen },
  { href: '/plan', key: 'plan', icon: Route },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const items = isAdmin ? [...BASE_ITEMS, { href: '/admin', key: 'admin', icon: ShieldCheck } as NavItem] : BASE_ITEMS;

  return (
    <>
      {/* ── Desktop: floating pill on the left ── */}
      <nav
        aria-label={t('mainNav')}
        className="fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-full bg-white px-3 py-4 shadow-float md:flex"
      >
        <Link
          href="/"
          aria-label="UNIMATE"
          className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-lavender-400 to-lavender-600 text-lg font-black text-white shadow-inner-3d"
        >
          U
        </Link>

        {items.map(({ href, key, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={t(key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative grid h-12 w-12 place-items-center rounded-full transition-colors',
                active ? 'text-white' : 'text-ink-muted hover:bg-lavender-50 hover:text-lavender-600',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-full bg-lavender-500 shadow-float"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className="relative h-5 w-5" aria-hidden />
              <span className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-bold text-white opacity-0 shadow-soft transition group-hover:opacity-100">
                {t(key)}
              </span>
            </Link>
          );
        })}

        <div className="my-2 h-px w-8 bg-lavender-100" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label={t('signOut')}
          className="group relative grid h-12 w-12 place-items-center rounded-full text-ink-muted transition hover:bg-peach-100 hover:text-peach-500"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          <span className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-bold text-white opacity-0 shadow-soft transition group-hover:opacity-100">
            {t('signOut')}
          </span>
        </button>
      </nav>

      {/* ── Mobile: floating bottom navigation bar ── */}
      <nav
        aria-label={t('mainNav')}
        className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-full bg-white/90 px-2 py-2 shadow-float backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {items.map(({ href, key, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-bold transition-colors',
                active ? 'text-white' : 'text-ink-muted',
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-full bg-lavender-500"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className="relative h-5 w-5" aria-hidden />
              <span className="relative">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
