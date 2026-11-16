'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookUp, Flame, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { firstName } from '@/lib/utils';

interface MascotWidgetProps {
  userName?: string | null;
  currentStreak: number;
  latestQuizId?: string | null;
}

export function MascotWidget({ userName, currentStreak, latestQuizId }: MascotWidgetProps) {
  const t = useTranslations('dashboard');
  const display = firstName(userName) || 'Friend';

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lavender-500 via-lavender-400 to-peach-300 p-6 text-white shadow-float">
      {/* Soft floating blobs */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-butter-200/35 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />

      <div className="relative flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t('studyCraftBadge')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-butter-200 px-3 py-1 text-xs font-black text-ink shadow-sm">
          <Flame className="h-3.5 w-3.5 text-peach-500" aria-hidden />
          {currentStreak}
        </span>
      </div>

      {/* Cartoon cat mascot with glasses teaching E = mc² */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mx-auto mt-4 flex justify-center"
      >
        <svg
          viewBox="0 0 260 175"
          className="h-44 w-full max-w-[260px] drop-shadow-md"
          role="img"
          aria-label="Professor Cat teaching E=mc2"
        >
          {/* Mini pastel chalkboard */}
          <rect x="134" y="18" width="112" height="74" rx="14" fill="#2B2545" stroke="#FFF0B3" strokeWidth="4" />
          <text
            x="190"
            y="62"
            textAnchor="middle"
            fill="#FFF0B3"
            fontSize="22"
            fontWeight="900"
            fontFamily="Nunito, sans-serif"
          >
            E = mc²
          </text>
          <circle cx="152" cy="34" r="3" fill="#FFBF99" />
          <circle cx="228" cy="78" r="2.5" fill="#C5B8F0" />

          {/* Cat ears */}
          <polygon points="44,58 56,22 80,46" fill="#FFEFE5" stroke="#2B2545" strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="52,52 59,30 73,45" fill="#FFBF99" />
          <polygon points="104,46 126,22 136,58" fill="#FFEFE5" stroke="#2B2545" strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="109,45 123,30 129,52" fill="#FFBF99" />

          {/* Cat head */}
          <ellipse cx="90" cy="78" rx="48" ry="42" fill="#FFEFE5" stroke="#2B2545" strokeWidth="3.5" />
          {/* Cheeks */}
          <ellipse cx="60" cy="88" rx="7" ry="4.5" fill="#FFD9C2" />
          <ellipse cx="120" cy="88" rx="7" ry="4.5" fill="#FFD9C2" />

          {/* Glasses */}
          <circle cx="72" cy="74" r="14" fill="#FFFFFF" fillOpacity="0.65" stroke="#7259C7" strokeWidth="3.5" />
          <circle cx="108" cy="74" r="14" fill="#FFFFFF" fillOpacity="0.65" stroke="#7259C7" strokeWidth="3.5" />
          <line x1="86" y1="74" x2="94" y2="74" stroke="#7259C7" strokeWidth="3.5" />

          {/* Eyes */}
          <circle cx="72" cy="74" r="4.5" fill="#2B2545" />
          <circle cx="108" cy="74" r="4.5" fill="#2B2545" />
          <circle cx="74" cy="72" r="1.5" fill="#FFFFFF" />
          <circle cx="110" cy="72" r="1.5" fill="#FFFFFF" />

          {/* Nose & smile */}
          <polygon points="86,84 94,84 90,89" fill="#F7834A" />
          <path d="M82,92 Q90,98 98,92" fill="none" stroke="#2B2545" strokeWidth="3" strokeLinecap="round" />

          {/* Sweater & pointer */}
          <path
            d="M50,158 C50,124 130,124 130,158 Z"
            fill="#A895E6"
            stroke="#2B2545"
            strokeWidth="3.5"
          />
          {/* Bowtie */}
          <polygon points="82,124 90,129 82,134" fill="#F7834A" stroke="#2B2545" strokeWidth="2.2" />
          <polygon points="98,124 90,129 98,134" fill="#F7834A" stroke="#2B2545" strokeWidth="2.2" />

          {/* Pointer stick pointing to E=mc2 */}
          <line x1="120" y1="138" x2="152" y2="82" stroke="#FFF0B3" strokeWidth="4" strokeLinecap="round" />
          <circle cx="120" cy="138" r="9" fill="#FFEFE5" stroke="#2B2545" strokeWidth="3" />
        </svg>
      </motion.div>

      <div className="relative mt-2 rounded-2xl bg-white/95 p-4 text-ink shadow-soft">
        <h2 className="text-base font-black text-ink">{t('mascotTitle')}</h2>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-soft">
          {t('mascotSpeech', { name: display })}
        </p>
        <p className="mt-2 text-[11px] font-bold text-lavender-700">
          {t('mascotStreakNote', { count: currentStreak })}
        </p>

        <div className="mt-3.5 flex flex-col gap-2">
          {latestQuizId ? (
            <Link href={`/quizzes/${latestQuizId}`} className="btn-primary w-full justify-center">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {t('startFocusQuiz')}
            </Link>
          ) : (
            <Link href="/library" className="btn-primary w-full justify-center">
              <BookUp className="h-4 w-4" aria-hidden />
              {t('uploadStudyDoc')}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
