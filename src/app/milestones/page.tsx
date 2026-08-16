import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ToggleDoneCheckbox } from "@/components/ToggleDoneCheckbox";
import { formatDate } from "@/lib/format";

/**
 * Cross-project milestone dashboard — one section per project showing its
 * completion rate, followed by that project's milestones (soonest first).
 * Projects are ordered by their nearest incomplete milestone so the ones
 * needing attention surface at the top.
 */
export default async function AllMilestonesPage() {
  const projects = await prisma.project.findMany({
    where: { milestones: { some: {} } },
    include: { milestones: { orderBy: { date: "asc" } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projectStats = projects
    .map((project) => {
      const total = project.milestones.length;
      const doneCount = project.milestones.filter((m) => m.done).length;
      const overdueCount = project.milestones.filter((m) => !m.done && m.date < today).length;
      const nextIncomplete = project.milestones.find((m) => !m.done);
      const percentage = total > 0 ? Math.round((doneCount / total) * 100) : 0;
      // Schedule status: any overdue (incomplete + past-due) milestone means
      // the project has slipped, regardless of how much is otherwise done.
      const scheduleStatus: "done" | "onTrack" | "delayed" =
        overdueCount > 0 ? "delayed" : percentage === 100 ? "done" : "onTrack";
      return {
        project,
        total,
        doneCount,
        percentage,
        overdueCount,
        scheduleStatus,
        // Projects with an incomplete milestone sort by how soon it's due;
        // fully-done projects (no incomplete milestone) sort to the end.
        sortDate: nextIncomplete?.date ?? new Date(8640000000000000),
      };
    })
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  const scheduleBadge: Record<"done" | "onTrack" | "delayed", { label: string; className: string }> = {
    done: { label: "✓ 全て完了", className: "bg-emerald-100 text-emerald-700" },
    onTrack: { label: "● オンスケジュール", className: "bg-amber-50 text-amber-700" },
    delayed: { label: "⚠ 遅延中", className: "bg-red-100 text-red-700" },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
          ← プロジェクト一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">全マイルストーン</h1>
        <p className="mt-1 text-sm text-stone-500">
          プロジェクトごとのマイルストーン達成率です。対応が必要なものが上に表示されます
        </p>
      </div>

      {projectStats.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-sm text-stone-500">
          マイルストーンがまだありません。各プロジェクトのマイルストーン画面から追加してください。
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {projectStats.map(
            ({ project, total, doneCount, percentage, overdueCount, scheduleStatus }) => (
            <section
              key={project.id}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Link
                  href={`/projects/${project.id}/milestones`}
                  className="truncate font-medium text-stone-800 hover:text-amber-700"
                >
                  {project.name}
                </Link>
                <div className="flex shrink-0 items-center gap-2 text-xs text-stone-500">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-medium ${scheduleBadge[scheduleStatus].className}`}
                  >
                    {scheduleBadge[scheduleStatus].label}
                    {scheduleStatus === "delayed" ? ` (${overdueCount}件)` : ""}
                  </span>
                  <span>
                    {doneCount}/{total} 完了
                  </span>
                  <span className="font-semibold text-stone-700">{percentage}%</span>
                </div>
              </div>

              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${
                    percentage === 100 ? "bg-emerald-500" : "bg-amber-600"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <ul className="flex flex-col gap-1.5">
                {project.milestones.map((m) => {
                  const overdue = !m.done && m.date < today;
                  return (
                    <li
                      key={m.id}
                      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                        overdue ? "bg-red-50" : "hover:bg-stone-50"
                      }`}
                    >
                      <ToggleDoneCheckbox milestoneId={m.id} projectId={project.id} done={m.done} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            m.done ? "text-stone-400 line-through" : "text-stone-800"
                          }`}
                        >
                          {m.name}
                          {m.isAiDraft && (
                            <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                              AI下書き
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-400">
                          {formatDate(m.date)}
                          {m.description ? ` ・ ${m.description}` : ""}
                        </p>
                      </div>
                      {overdue && (
                        <span className="shrink-0 text-xs font-medium text-red-600">遅延</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
