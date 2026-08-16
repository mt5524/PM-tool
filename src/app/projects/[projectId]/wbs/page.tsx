import { prisma } from "@/lib/prisma";
import { buildWbsTree } from "@/lib/wbs";
import { WbsTree } from "@/components/WbsTree";
import { TaskDialog } from "@/components/TaskDialog";
import { ImportDialog } from "@/components/ImportDialog";

export default async function WbsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const tasks = await prisma.task.findMany({ where: { projectId } });
  const tree = buildWbsTree(tasks);
  const taskOptions = tasks.map((t) => ({ id: t.id, title: t.title }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-800">WBS(作業分解構成図)</h2>
        <div className="flex items-center gap-2">
          <ImportDialog
            projectId={projectId}
            mode="tasks"
            trigger={
              <span className="rounded border border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50">
                文書からインポート
              </span>
            }
          />
          <TaskDialog
            projectId={projectId}
            taskOptions={taskOptions}
            trigger={
              <span className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700">
                + タスク追加
              </span>
            }
          />
        </div>
      </div>
      <WbsTree nodes={tree} projectId={projectId} taskOptions={taskOptions} />
    </div>
  );
}
