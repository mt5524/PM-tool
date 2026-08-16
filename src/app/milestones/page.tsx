import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ToggleDoneCheckbox } from "@/components/ToggleDoneCheckbox";
import { formatDate } from "@/lib/format";

/**
 * Cross-project milestone overview — the foundation for a future
 * calendar/timeline view. For now: every milestone across every project,
 * sorted by date, with a link back to the owning project.
 */
export default async function AllMilestonesPage() {
  const milestones = await prisma.milestone.findMany({
    orderBy: { date: "asc" },
    include: { project: { select: { id: true, name: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
          ← プロジェクト一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">全マイルストーン</h1>
        <p className="mt-1 text-sm text-stone-500">
          すべてのプロジェクトのマイルストーンを日付順に表示しています
        </p>
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-sm text-stone-500">
          マイルストーンがまだありません。各プロジェクトのマイルストーン画面から追加してください。
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm"
            >
              <ToggleDoneCheckbox milestoneId={m.id} projectId={m.project.id} done={m.done} />
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
              <Link
                href={`/projects/${m.project.id}/milestones`}
                className="shrink-0 truncate rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200"
              >
                {m.project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
