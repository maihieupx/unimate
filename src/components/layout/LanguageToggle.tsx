'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { setLocale } from '@/i18n/actions';
import { isLocale, locales, type AppLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';

const FLAGS: Record<AppLocale, string> = { vi: '🇻🇳', en: '🇬🇧' };

export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations('topbar');
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic selection so the pill slides immediately.
  const [selected, setSelected] = useState<AppLocale>(isLocale(current) ? current : 'vi');

  useEffect(() => {
    if (isLocale(current)) setSelected(current);
  }, [current]);

  const change = (next: AppLocale) => {
    if (next === selected) return;
    setSelected(next);
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      className={cn('relative flex items-center rounded-full bg-lavender-100 p-1', pending && 'opacity-80', className)}
    >
      {locales.map((locale) => {
        const active = selected === locale;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => change(locale)}
            className={cn(
              'relative z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors',
              active ? 'text-lavender-700' : 'text-ink-soft hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId="language-pill"
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span aria-hidden>{FLAGS[locale]}</span>
            {locale.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
