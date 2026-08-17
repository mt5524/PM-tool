import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteProject, updateProject } from "@/lib/actions/projects";
import { toDateInputValue } from "@/lib/forms";
import { projectStatusLabels } from "@/lib/labels";
import { ProjectStatus } from "@prisma/client";
import { DeleteButton } from "@/components/DeleteButton";
import { ArchiveButton } from "@/components/ArchiveButton";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const updateProjectWithId = updateProject.bind(null, projectId);

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <form action={updateProjectWithId} className="flex flex-col gap-3">
        <h2 className="mb-1 text-lg font-medium text-stone-800">プロジェクト設定</h2>

        <label className="text-sm">
          プロジェクト名
          <input
            name="name"
            required
            defaultValue={project.name}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-sm">
          説明
          <textarea
            name="description"
            defaultValue={project.description ?? ""}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-sm">
          ステータス
          <select
            name="status"
            defaultValue={project.status}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          >
            {Object.values(ProjectStatus).map((s) => (
              <option key={s} value={s}>
                {projectStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            開始日
            <input
              type="date"
              name="startDate"
              defaultValue={toDateInputValue(project.startDate)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            終了予定日
            <input
              type="date"
              name="endDate"
              defaultValue={toDateInputValue(project.endDate)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-2 self-start rounded bg-amber-700 px-4 py-1.5 text-sm text-white hover:bg-amber-800"
        >
          保存
        </button>
      </form>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div>
          <h3 className="mb-1 text-sm font-medium text-stone-700">アーカイブ</h3>
          <p className="text-xs text-stone-500">
            {project.status === ProjectStatus.ARCHIVED
              ? "このプロジェクトはアーカイブ済みです。プロジェクト一覧には表示されません。"
              : "作業が終わったプロジェクトをアーカイブすると、通常の一覧から隠れます(いつでも解除できます)。"}
          </p>
        </div>
        <ArchiveButton
          projectId={projectId}
          archived={project.status === ProjectStatus.ARCHIVED}
        />
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="mb-1 text-sm font-medium text-red-700">危険な操作</h3>
        <p className="mb-3 text-xs text-red-600">
          プロジェクトを削除すると、すべてのタスク・マイルストーンも削除されます。元に戻せません。
        </p>
        <DeleteButton
          action={deleteProject.bind(null, projectId)}
          confirmText={`「${project.name}」を削除しますか?この操作は取り消せません。`}
          label="プロジェクトを削除"
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
        />
      </div>
    </div>
  );
}
