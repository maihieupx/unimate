'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Lock, Mail, Sparkles, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageToggle } from '@/components/layout/LanguageToggle';

function mapAuthError(code: string | undefined, t: ReturnType<typeof useTranslations<'auth'>>) {
  if (!code) return null;
  if (code === 'AccountSuspended') return t('errSuspended');
  if (code === 'SessionRevoked') return t('errRevoked');
  if (code === 'OAuthAccountNotLinked') return t('errOAuthLinked');
  if (code === 'CredentialsSignin') return t('errInvalid');
  return t('errGeneric');
}

export function LoginForm({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError?: string;
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => mapAuthError(initialError, t));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/',
    });
    setLoading(false);
    if (!res || res.error) {
      setError(mapAuthError(res?.error ?? 'CredentialsSignin', t));
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-lavender-400 to-lavender-600 text-lg font-black text-white shadow-inner-3d">
            U
          </span>
          <span className="text-xl font-black tracking-tight text-ink">UNIMATE</span>
        </div>
        <LanguageToggle />
      </div>

      <div className="card w-full max-w-md space-y-5 p-7 sm:p-8">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1 text-[11px] font-extrabold text-lavender-700">
            <Sparkles className="h-3 w-3" aria-hidden />
            1 User = 1 Account
          </span>
          <h1 className="mt-3 text-2xl font-black text-ink">{t('loginTitle')}</h1>
          <p className="mt-1 text-xs font-semibold text-ink-soft">{t('loginSubtitle')}</p>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-ink-soft">{t('emailLabel')}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" aria-hidden />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-ink-soft">{t('passwordLabel')}</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" aria-hidden />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? t('loggingIn') : t('loginButton')}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs font-bold text-ink-muted">
              <span className="h-px flex-1 bg-lavender-100" />
              {t('orContinueWith')}
              <span className="h-px flex-1 bg-lavender-100" />
            </div>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="btn-soft w-full py-3"
            >
              {t('googleButton')}
            </button>
          </>
        )}

        <p className="text-center text-xs font-bold text-ink-soft">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-lavender-700 hover:underline">
            {t('registerLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === 'EMAIL_TAKEN') throw new Error(t('errEmailTaken'));
        if (data.error === 'VALIDATION_ERROR') throw new Error(t('errWeakPassword'));
        throw new Error(t('errGeneric'));
      }

      const loginRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/',
      });
      if (loginRes?.error) {
        router.push('/login');
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-lavender-400 to-lavender-600 text-lg font-black text-white shadow-inner-3d">
            U
          </span>
          <span className="text-xl font-black tracking-tight text-ink">UNIMATE</span>
        </div>
        <LanguageToggle />
      </div>

      <div className="card w-full max-w-md space-y-5 p-7 sm:p-8">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-peach-100 px-3 py-1 text-[11px] font-extrabold text-peach-500">
            <Sparkles className="h-3 w-3" aria-hidden />
            1 User = 1 Account
          </span>
          <h1 className="mt-3 text-2xl font-black text-ink">{t('registerTitle')}</h1>
          <p className="mt-1 text-xs font-semibold text-ink-soft">{t('registerSubtitle')}</p>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-ink-soft">{t('nameLabel')}</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" aria-hidden />
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-ink-soft">{t('emailLabel')}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" aria-hidden />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-ink-soft">{t('passwordLabel')}</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ink-muted" aria-hidden />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
              />
            </div>
            <p className="mt-1 text-[11px] font-semibold text-ink-muted">{t('passwordHint')}</p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? t('registering') : t('registerButton')}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs font-bold text-ink-muted">
              <span className="h-px flex-1 bg-lavender-100" />
              {t('orContinueWith')}
              <span className="h-px flex-1 bg-lavender-100" />
            </div>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="btn-soft w-full py-3"
            >
              {t('googleButton')}
            </button>
          </>
        )}

        <p className="text-center text-xs font-bold text-ink-soft">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-lavender-700 hover:underline">
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
