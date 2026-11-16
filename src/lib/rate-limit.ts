import { HttpError } from './http';

/**
 * Minimal fixed-window rate limiter (per process).
 * For multi-instance deployments, swap the Map for Redis/Upstash.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new HttpError(429, 'RATE_LIMITED');
  }
  bucket.count += 1;
}

/** AI endpoints: 20 calls / 10 minutes / user by default. */
export function aiRateLimit(userId: string) {
  rateLimit(`ai:${userId}`, 20, 10 * 60 * 1000);
}
