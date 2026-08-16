import { prisma } from "@/lib/prisma";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { DeleteButton } from "@/components/DeleteButton";
import { ToggleDoneCheckbox } from "@/components/ToggleDoneCheckbox";
import { deleteMilestone } from "@/lib/actions/milestones";
import { formatDate } from "@/lib/format";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { date: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-800">マイルストーン</h2>
        <div className="flex items-center gap-2">
          <ImportDialog
            projectId={projectId}
            mode="milestones"
            trigger={
              <span className="rounded border border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50">
                文書からインポート
              </span>
            }
          />
          <MilestoneDialog
            projectId={projectId}
            trigger={
              <span className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700">
                + マイルストーン追加
              </span>
            }
          />
        </div>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-neutral-500">マイルストーンがまだありません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
            >
              <ToggleDoneCheckbox milestoneId={m.id} projectId={projectId} done={m.done} />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    m.done ? "text-neutral-400 line-through" : "text-neutral-800"
                  }`}
                >
                  {m.name}
                  {m.isAiDraft && (
                    <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">
                      AI下書き
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-400">
                  {formatDate(m.date)}
                  {m.description ? ` ・ ${m.description}` : ""}
                </p>
              </div>
              <MilestoneDialog
                projectId={projectId}
                milestone={m}
                trigger={
                  <span className="cursor-pointer text-sm text-sky-600 hover:underline">編集</span>
                }
              />
              <DeleteButton
                action={deleteMilestone.bind(null, m.id, projectId)}
                confirmText={`「${m.name}」を削除しますか?`}
                label="削除"
                className="text-sm text-red-500 hover:underline"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
