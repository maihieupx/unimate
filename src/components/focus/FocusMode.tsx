'use client';

/**
 * UNIMATE Focus Mode — strict anti-distraction / anti-cheat shell for quizzes & exercises.
 *
 *  • Requests the Fullscreen API (must be triggered from a user gesture → call `focus.enter()` in onClick).
 *  • Listens to `visibilitychange`, window `blur`, `fullscreenchange` and `popstate` (Back button).
 *  • Shows a blocking "Focus mode interrupted!" overlay on every violation and counts it.
 *  • `beforeunload` prompts before closing / refreshing the tab.
 *  • Blocks copy / paste / context menu / print / save / refresh shortcuts.
 *  • The ONLY ways out are the explicit "Abandon exercise" and "Submit" buttons.
 *
 * Usage:
 *   const focus = useFocusMode({ onViolation: (v, total) => ... });
 *   <button onClick={() => focus.enter()}>Start</button>
 *   <FocusMode focus={focus} title="Quiz" onSubmit={submit} onAbandon={abandon}>…</FocusMode>
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Clock, Flag, Loader2, Maximize2, Send, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// ───────────────────────────── Types ─────────────────────────────

export type ViolationType = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'NAVIGATION_ATTEMPT';

export interface FocusViolation {
  type: ViolationType;
  at: number;
}

export type FocusStatus = 'idle' | 'active' | 'interrupted' | 'released';

interface UseFocusModeOptions {
  onViolation?: (violation: FocusViolation, total: number) => void;
}

// ───────────────────────────── Fullscreen helpers (incl. Safari prefixes) ─────────────────────────────

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function getFullscreenElement() {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FsElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

async function requestFullscreen() {
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
    return true;
  } catch {
    return false; // denied (no user gesture / iOS) — visibility & blur guards still apply
  }
}

async function exitFullscreen() {
  const d = document as FsDocument;
  if (!getFullscreenElement()) return;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else await d.webkitExitFullscreen?.();
  } catch {
    /* already exited */
  }
}

/** One user action often fires several events (blur + visibilitychange). Count it once. */
const DEDUPE_MS = 800;
const BLOCKED_SHORTCUTS = new Set(['c', 'x', 'v', 'p', 's', 'r', 'u']);

// ───────────────────────────── Hook ─────────────────────────────

export function useFocusMode(options: UseFocusModeOptions = {}) {
  const [status, setStatus] = useState<FocusStatus>('idle');
  const [violations, setViolations] = useState<FocusViolation[]>([]);

  const enforcingRef = useRef(false);
  const lastViolationAt = useRef(0);
  const countRef = useRef(0);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const registerViolation = useCallback((type: ViolationType) => {
    if (!enforcingRef.current) return;
    setStatus('interrupted');

    const now = Date.now();
    if (now - lastViolationAt.current < DEDUPE_MS) return;
    lastViolationAt.current = now;

    const violation = { type, at: now };
    countRef.current += 1;
    setViolations((prev) => [...prev, violation]);
    optionsRef.current.onViolation?.(violation, countRef.current);
  }, []);

  /** Call directly from a click handler (Fullscreen API requires a user gesture). */
  const enter = useCallback(async () => {
    enforcingRef.current = true;
    countRef.current = 0;
    setViolations([]);
    setStatus('active');
    // Trap the Back button: keep Next.js router state (__NA) so its popstate handler stays happy.
    window.history.pushState({ ...window.history.state, __focusGuard: true }, '', window.location.href);
    await requestFullscreen();
  }, []);

  /** "Return to task" from the interruption overlay (also a user gesture). */
  const resume = useCallback(async () => {
    if (!enforcingRef.current) return;
    await requestFullscreen();
    setStatus('active');
  }, []);

  /** Temporarily stop counting (e.g. while a submission request is in flight). */
  const suspend = useCallback(() => {
    enforcingRef.current = false;
  }, []);

  const unsuspend = useCallback(() => {
    enforcingRef.current = true;
  }, []);

  /** Fully leave Focus Mode. Only Submit / Abandon should call this. */
  const release = useCallback(async () => {
    enforcingRef.current = false;
    setStatus('released');
    await exitFullscreen();
  }, []);

  const listening = status === 'active' || status === 'interrupted';

  useEffect(() => {
    if (!listening) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') registerViolation('TAB_HIDDEN');
    };
    const onBlur = () => registerViolation('WINDOW_BLUR');
    const onFullscreenChange = () => {
      if (!getFullscreenElement()) registerViolation('FULLSCREEN_EXIT');
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enforcingRef.current) return;
      event.preventDefault();
      event.returnValue = ''; // legacy browsers need returnValue to show the prompt
      return '';
    };
    const onPopState = () => {
      if (!enforcingRef.current) return;
      window.history.pushState({ ...window.history.state, __focusGuard: true }, '', window.location.href);
      registerViolation('NAVIGATION_ATTEMPT');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      if (key === 'f5' || (mod && BLOCKED_SHORTCUTS.has(key))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const block = (event: Event) => event.preventDefault();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
    };
  }, [listening, registerViolation]);

  // Safety net: never leave the browser stuck in fullscreen after unmount.
  useEffect(
    () => () => {
      if (enforcingRef.current) {
        enforcingRef.current = false;
        void exitFullscreen();
      }
    },
    [],
  );

  return {
    status,
    violations,
    violationCount: violations.length,
    lastViolation: violations[violations.length - 1] ?? null,
    enter,
    resume,
    suspend,
    unsuspend,
    release,
  };
}

export type FocusController = ReturnType<typeof useFocusMode>;

// ───────────────────────────── Component ─────────────────────────────

interface FocusModeProps {
  focus: FocusController;
  title: string;
  subtitle?: string;
  /** Resolve on success; throw to stay in Focus Mode and show an error. */
  onSubmit: () => Promise<void>;
  onAbandon: () => Promise<void> | void;
  submitDisabled?: boolean;
  children: ReactNode;
}

function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now() - seconds * 1000;
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function FocusMode({ focus, title, subtitle, onSubmit, onAbandon, submitDisabled, children }: FocusModeProps) {
  const t = useTranslations('focus');
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [busy, setBusy] = useState<'submit' | 'abandon' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = focus.status === 'active' || focus.status === 'interrupted';
  const elapsed = useElapsed(visible);

  if (!visible) return null;

  const handleSubmit = async () => {
    setBusy('submit');
    setError(null);
    focus.suspend(); // don't count the network wait as a violation
    try {
      await onSubmit();
      await focus.release();
    } catch (e) {
      focus.unsuspend();
      setError(e instanceof Error && e.message ? e.message : t('submitError'));
    } finally {
      setBusy(null);
    }
  };

  const handleAbandon = async () => {
    setBusy('abandon');
    await focus.release();
    try {
      await onAbandon();
    } finally {
      setBusy(null);
      setConfirmAbandon(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-mode-title"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-canvas select-none"
    >
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center gap-3 border-b border-lavender-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-lavender-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-lavender-700">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {t('badge')}
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="focus-mode-title" className="truncate text-base font-extrabold text-ink sm:text-lg">
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-100 px-3 py-1.5 text-sm font-bold tabular-nums text-ink">
          <Clock className="h-4 w-4 text-peach-500" aria-hidden />
          {elapsed}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold',
            focus.violationCount === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600',
          )}
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {t('violations', { count: focus.violationCount })}
        </span>

        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setConfirmAbandon(true)}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 sm:flex-none"
          >
            <Flag className="h-4 w-4" aria-hidden />
            {t('abandon')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy !== null || submitDisabled}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-lavender-600 px-5 py-2 text-sm font-bold text-white shadow-float transition hover:bg-lavender-700 disabled:opacity-50 sm:flex-none"
          >
            {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {busy === 'submit' ? t('submitting') : t('submit')}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mx-auto mt-4 w-full max-w-3xl rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      {/* ── Exercise content ── */}
      <main
        className={cn(
          'flex-1 overflow-y-auto px-4 py-6 transition duration-300 sm:px-8',
          focus.status === 'interrupted' && 'pointer-events-none blur-md',
        )}
        aria-hidden={focus.status === 'interrupted'}
      >
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>

      {/* ── Interruption overlay ── */}
      <AnimatePresence>
        {focus.status === 'interrupted' && (
          <motion.div
            key="interrupted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="focus-interrupted-title"
            aria-describedby="focus-interrupted-body"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-float"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ duration: 0.6 }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-100 text-rose-500 shadow-inner-3d"
              >
                <AlertTriangle className="h-8 w-8" aria-hidden />
              </motion.div>
              <h2 id="focus-interrupted-title" className="mt-5 text-2xl font-black text-ink">
                {t('interruptedTitle')}
              </h2>
              <p id="focus-interrupted-body" className="mt-2 text-ink-soft">
                {t('interruptedBody')}
              </p>
              {focus.lastViolation && (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                  {t(`reason.${focus.lastViolation.type}`)} · {t('recorded', { count: focus.violationCount })}
                </p>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => void focus.resume()}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lavender-600 px-6 py-3 font-bold text-white shadow-float transition hover:bg-lavender-700"
              >
                <Maximize2 className="h-5 w-5" aria-hidden />
                {t('returnToTask')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Abandon confirmation ── */}
      <AnimatePresence>
        {confirmAbandon && (
          <motion.div
            key="abandon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 grid place-items-center bg-ink/50 p-4 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="focus-abandon-title"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-float"
            >
              <h2 id="focus-abandon-title" className="text-xl font-black text-ink">
                {t('confirmAbandonTitle')}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{t('confirmAbandonBody')}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmAbandon(false)}
                  className="flex-1 rounded-full bg-lavender-100 px-4 py-2.5 font-bold text-lavender-700 transition hover:bg-lavender-200"
                >
                  {t('keepGoing')}
                </button>
                <button
                  type="button"
                  onClick={handleAbandon}
                  disabled={busy !== null}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-2.5 font-bold text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {busy === 'abandon' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {t('confirmAbandonYes')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
