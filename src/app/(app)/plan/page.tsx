import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/lib/session';
import { LearningPlanClient } from '@/components/plan/LearningPlanClient';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const user = await requirePageUser();

  const plan = await prisma.learningPlan.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { order: 'asc' } } },
  });

  return (
    <LearningPlanClient
      initialPlan={
        plan
          ? {
              id: plan.id,
              title: plan.title,
              summary: plan.summary,
              weakTopics: plan.weakTopics,
              items: plan.items.map((it) => ({
                ...it,
                scheduledFor: it.scheduledFor.toISOString(),
              })),
            }
          : null
      }
    />
  );
}
