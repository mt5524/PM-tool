import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectDialog } from "@/components/ProjectDialog";
import { projectStatusColors, projectStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: true, milestones: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">プロジェクト</h1>
          <p className="mt-1 text-sm text-stone-500">すべてのプロジェクトの一覧です</p>
        </div>
        <ProjectDialog
          trigger={
            <span className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
              + 新規プロジェクト
            </span>
          }
        />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-sm text-stone-500">
          プロジェクトがまだありません。「+ 新規プロジェクト」から作成してください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="truncate font-medium text-stone-800">{project.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    projectStatusColors[project.status]
                  }`}
                >
                  {projectStatusLabels[project.status]}
                </span>
              </div>
              {project.description && (
                <p className="mb-3 line-clamp-2 text-sm text-stone-500">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                <span>タスク {project._count.tasks}件</span>
                <span>マイルストーン {project._count.milestones}件</span>
                {project.endDate && <span>期限 {formatDate(project.endDate)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
