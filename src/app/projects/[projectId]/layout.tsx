import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectTabs } from "@/components/ProjectTabs";
import { projectStatusColors, projectStatusLabels } from "@/lib/labels";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
        ← プロジェクト一覧
      </Link>
      <div className="mt-2 mb-1 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">{project.name}</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${projectStatusColors[project.status]}`}
        >
          {projectStatusLabels[project.status]}
        </span>
      </div>
      {project.description && (
        <p className="mb-4 text-sm text-stone-500">{project.description}</p>
      )}
      <ProjectTabs projectId={projectId} />
      {children}
    </div>
  );
}
