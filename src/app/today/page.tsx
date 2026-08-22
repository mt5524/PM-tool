import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, TaskStatus } from "@prisma/client";
import { PriorityBadge } from "@/components/PriorityBadge";
import { TaskStatusSelect } from "@/components/TaskStatusSelect";
import { formatDate } from "@/lib/format";

/**
 * Cross-project "what should I work on today" view: overdue tasks, tasks due
 * today, and tasks scheduled to start today. Archived projects are excluded.
 */
export default async function TodayPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: TaskStatus.DONE },
      project: { status: { not: ProjectStatus.ARCHIVED } },
      OR: [{ dueDate: { lt: tomorrow } }, { startDate: { gte: today, lt: tomorrow } }],
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: "asc" }],
  });

  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow);
  const startingToday = tasks.filter(
    (t) =>
      t.startDate &&
      t.startDate >= today &&
      t.startDate < tomorrow &&
      !(t.dueDate && t.dueDate < tomorrow),
  );

  const isEmpty = overdue.length === 0 && dueToday.length === 0 && startingToday.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
          ← プロジェクト一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">今日のタスク</h1>
        <p className="mt-1 text-sm text-stone-500">
          {formatDate(today)} 時点で、対応が必要なタスクの一覧です(全プロジェクト横断)
        </p>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-sm text-stone-500">
          今日対応が必要なタスクはありません 🎉
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <TaskSection title="⚠ 期限切れ" tasks={overdue} emphasis="danger" />
          <TaskSection title="📅 今日期限" tasks={dueToday} emphasis="today" />
          <TaskSection title="▶ 今日開始予定" tasks={startingToday} emphasis="start" />
        </div>
      )}
    </div>
  );
}

type TaskWithProject = Awaited<ReturnType<typeof prisma.task.findMany>>[number] & {
  project: { id: string; name: string };
};

function TaskSection({
  title,
  tasks,
  emphasis,
}: {
  title: string;
  tasks: TaskWithProject[];
  emphasis: "danger" | "today" | "start";
}) {
  if (tasks.length === 0) return null;

  const borderColor =
    emphasis === "danger"
      ? "border-red-200"
      : emphasis === "today"
        ? "border-amber-200"
        : "border-stone-200";

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-stone-700">
        {title} <span className="text-stone-400">({tasks.length}件)</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm ${borderColor}`}
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/projects/${task.project.id}/wbs`}
                className="text-xs text-stone-400 hover:text-amber-700"
              >
                {task.project.name}
              </Link>
              <p className="truncate text-sm font-medium text-stone-800">{task.title}</p>
            </div>
            <PriorityBadge priority={task.priority} />
            {task.dueDate && (
              <span
                className={`shrink-0 text-xs ${
                  emphasis === "danger" ? "font-medium text-red-600" : "text-stone-400"
                }`}
              >
                期限 {formatDate(task.dueDate)}
              </span>
            )}
            <TaskStatusSelect taskId={task.id} projectId={task.project.id} status={task.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
