import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import { ArchiveButton } from "@/components/ArchiveButton";
import { formatDate } from "@/lib/format";

export default async function ArchivedProjectsPage() {
  const projects = await prisma.project.findMany({
    where: { status: ProjectStatus.ARCHIVED },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: true, milestones: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
          ← プロジェクト一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">アーカイブ済みプロジェクト</h1>
        <p className="mt-1 text-sm text-stone-500">
          通常のプロジェクト一覧には表示されないプロジェクトです。解除するといつでも一覧に戻せます
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-sm text-stone-500">
          アーカイブ済みのプロジェクトはありません。
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-3.5 shadow-sm"
            >
              <Link
                href={`/projects/${project.id}`}
                className="min-w-0 flex-1 truncate font-medium text-stone-800 hover:text-amber-700"
              >
                {project.name}
              </Link>
              <span className="hidden shrink-0 text-xs text-stone-400 sm:inline">
                タスク {project._count.tasks}件 ・ マイルストーン {project._count.milestones}件
              </span>
              {project.endDate && (
                <span className="hidden shrink-0 text-xs text-stone-400 md:inline">
                  期限 {formatDate(project.endDate)}
                </span>
              )}
              <ArchiveButton projectId={project.id} archived />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
