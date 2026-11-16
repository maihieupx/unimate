import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { handleApiError } from '@/lib/http';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const s = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** GET /api/export — CSV export of the user's progress (Topbar "Export" button). */
export async function GET() {
  try {
    const user = await requireUser();
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: user.id, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      select: {
        submittedAt: true,
        score: true,
        maxScore: true,
        percent: true,
        focusViolations: true,
        timeSpentSec: true,
        quiz: { select: { title: true, difficulty: true } },
      },
    });

    const header = ['submitted_at', 'quiz', 'difficulty', 'score', 'max_score', 'percent', 'focus_violations', 'time_spent_sec'];
    const rows = attempts.map((a) =>
      [
        a.submittedAt?.toISOString(),
        a.quiz.title,
        a.quiz.difficulty,
        a.score,
        a.maxScore,
        a.percent,
        a.focusViolations,
        a.timeSpentSec,
      ]
        .map(csvCell)
        .join(','),
    );
    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="unimate-progress-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
