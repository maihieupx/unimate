export const locales = ['vi', 'en'] as const;
export type AppLocale = (typeof locales)[number];

/** Vietnamese is the default on first load. */
export const defaultLocale: AppLocale = 'vi';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
