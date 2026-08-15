import { prisma } from "@/lib/prisma";
import { GanttChart } from "@/components/GanttChart";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [tasks, milestones] = await Promise.all([
    prisma.task.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    prisma.milestone.findMany({ where: { projectId }, orderBy: { date: "asc" } }),
  ]);

  return <GanttChart tasks={tasks} milestones={milestones} />;
}
