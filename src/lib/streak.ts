import type { Prisma, Streak } from '@prisma/client';

const DAY_MS = 86_400_000;

/** YYYY-MM-DD for `date` in the given IANA timezone. */
export function localDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function keyToUtc(key: string) {
  return Date.parse(`${key}T00:00:00Z`);
}

export function dayDiff(fromKey: string, toKey: string) {
  return Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / DAY_MS);
}

export function shiftDateKey(key: string, days: number) {
  return new Date(keyToUtc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Oldest → newest list of `n` day keys ending at `todayKey`. */
export function lastNDays(todayKey: string, n: number) {
  return Array.from({ length: n }, (_, i) => shiftDateKey(todayKey, i - (n - 1)));
}

/**
 * A streak is "alive" if the user studied today or yesterday.
 * Otherwise it's displayed as 0 until the next activity resets it.
 */
export function displayStreak(streak: Pick<Streak, 'currentStreak' | 'lastActiveDate'> | null, timeZone: string) {
  if (!streak?.lastActiveDate) return 0;
  const gap = dayDiff(streak.lastActiveDate, localDateKey(new Date(), timeZone));
  return gap <= 1 ? streak.currentStreak : 0;
}

/** Quality = score penalised by Focus Mode violations (5 points each). */
export function qualityScore(scorePercent: number, focusViolations: number) {
  return Math.max(0, Math.min(100, Math.round(scorePercent - focusViolations * 5)));
}

interface RecordActivityInput {
  userId: string;
  timeZone: string;
  minutes: number;
  scorePercent: number;
  focusViolations: number;
}

/**
 * Records a completed exercise for today and advances the learning streak
 * (Duolingo-style: +1 per consecutive local day, a freeze token covers one missed day).
 * Must run inside a transaction.
 */
export async function recordStudyActivity(tx: Prisma.TransactionClient, input: RecordActivityInput) {
  const today = localDateKey(new Date(), input.timeZone);
  const quality = qualityScore(input.scorePercent, input.focusViolations);

  const existing = await tx.studyActivity.findUnique({
    where: { userId_date: { userId: input.userId, date: today } },
  });

  if (existing) {
    const n = existing.quizzesCompleted;
    await tx.studyActivity.update({
      where: { id: existing.id },
      data: {
        minutes: existing.minutes + input.minutes,
        quizzesCompleted: n + 1,
        avgScore: ((existing.avgScore ?? 0) * n + input.scorePercent) / (n + 1),
        qualityScore: ((existing.qualityScore ?? 0) * n + quality) / (n + 1),
      },
    });
  } else {
    await tx.studyActivity.create({
      data: {
        userId: input.userId,
        date: today,
        minutes: input.minutes,
        quizzesCompleted: 1,
        avgScore: input.scorePercent,
        qualityScore: quality,
      },
    });
  }

  const streak = await tx.streak.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId },
    update: {},
  });

  if (streak.lastActiveDate === today) return streak;

  const gap = streak.lastActiveDate ? dayDiff(streak.lastActiveDate, today) : Infinity;
  let current = 1;
  let freezeTokens = streak.freezeTokens;

  if (gap === 1) {
    current = streak.currentStreak + 1;
  } else if (gap === 2 && freezeTokens > 0) {
    current = streak.currentStreak + 1;
    freezeTokens -= 1;
  }

  // Earn a freeze every 7 consecutive days (max 2 banked).
  if (current > 0 && current % 7 === 0) freezeTokens = Math.min(2, freezeTokens + 1);

  return tx.streak.update({
    where: { userId: input.userId },
    data: {
      currentStreak: current,
      longestStreak: Math.max(streak.longestStreak, current),
      lastActiveDate: today,
      freezeTokens,
    },
  });
}
