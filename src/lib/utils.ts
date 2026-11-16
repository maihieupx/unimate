import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function initials(name?: string | null, fallback = 'U') {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
  return letters.toUpperCase() || fallback;
}

export function firstName(name?: string | null) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  // Vietnamese names put the given name last ("Nguyễn Văn An" → "An").
  return parts[parts.length - 1];
}

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isOnline(lastSeenAt: Date | string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function round(value: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
