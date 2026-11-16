import { getLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type AppLocale } from './config';

export async function getAppLocale(): Promise<AppLocale> {
  const locale = await getLocale();
  return isLocale(locale) ? locale : defaultLocale;
}
