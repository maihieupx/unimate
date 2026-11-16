import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/lib/session';
import { QuizRunner } from '@/components/quiz/QuizRunner';

export const dynamic = 'force-dynamic';

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      difficulty: true,
      document: { select: { title: true, fileName: true } },
      questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          order: true,
          type: true,
          prompt: true,
          options: true,
          topic: true,
          points: true,
        },
      },
    },
  });

  if (!quiz) notFound();

  return (
    <QuizRunner
      quiz={{
        id: quiz.id,
        title: quiz.title,
        difficulty: quiz.difficulty,
        documentTitle: quiz.document ? (quiz.document.title ?? quiz.document.fileName) : null,
        questions: quiz.questions,
      }}
    />
  );
}
