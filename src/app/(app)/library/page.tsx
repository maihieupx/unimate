import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/lib/session';
import { LearningHubClient } from '@/components/library/LearningHubClient';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const user = await requirePageUser();

  const [documents, quizzes] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        title: true,
        summary: true,
        keyPoints: true,
        topics: true,
        status: true,
        sizeBytes: true,
        estimatedStudyMinutes: true,
        createdAt: true,
      },
      take: 50,
    }),
    prisma.quiz.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        difficulty: true,
        createdAt: true,
        document: { select: { title: true, fileName: true } },
        _count: { select: { questions: true } },
      },
      take: 30,
    }),
  ]);

  return (
    <LearningHubClient
      initialDocuments={documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))}
      initialQuizzes={quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        questionCount: q._count.questions,
        documentTitle: q.document ? (q.document.title ?? q.document.fileName) : null,
        createdAt: q.createdAt.toISOString(),
      }))}
    />
  );
}
