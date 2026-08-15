import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/KanbanBoard";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const taskOptions = tasks.map((t) => ({ id: t.id, title: t.title }));

  return <KanbanBoard projectId={projectId} tasks={tasks} taskOptions={taskOptions} />;
}
