import Link from "next/link";
import { Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import {
  priorityColors,
  priorityLabels,
  projectStatusColors,
  projectStatusLabels,
  taskStatusColors,
  taskStatusLabels,
} from "@/lib/labels";

/** Static reference page explaining what every color in the app means. */
export default function LegendPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
          ← プロジェクト一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">色の凡例</h1>
        <p className="mt-1 text-sm text-stone-500">
          画面内の色分けバッジの意味の一覧です。この一覧は{" "}
          <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">docs/color-legend.md</code>{" "}
          にも同じ内容を記載しています。
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <LegendSection title="プロジェクトのステータス">
          {Object.values(ProjectStatus).map((s) => (
            <LegendRow key={s} className={projectStatusColors[s]} label={projectStatusLabels[s]} />
          ))}
        </LegendSection>

        <LegendSection title="タスクのステータス(カンバン・WBS・ガント共通)">
          {Object.values(TaskStatus).map((s) => (
            <LegendRow key={s} className={taskStatusColors[s]} label={taskStatusLabels[s]} />
          ))}
        </LegendSection>

        <LegendSection title="優先度">
          {Object.values(Priority).map((p) => (
            <LegendRow key={p} className={priorityColors[p]} label={priorityLabels[p]} />
          ))}
        </LegendSection>

        <LegendSection title="その他のマーク">
          <LegendRow className="bg-violet-100 text-violet-700" label="AI下書き(未確認のインポート結果)" />
          <div className="flex items-center gap-3 text-sm text-stone-700">
            <span className="inline-block h-3 w-3 rotate-45 bg-amber-500" />
            マイルストーン(ガントチャート上)
          </div>
          <div className="flex items-center gap-3 text-sm text-stone-700">
            <span className="inline-block h-4 w-0.5 bg-red-300" />
            本日(ガントチャート・WBSのタイムライン上)
          </div>
        </LegendSection>
      </div>
    </div>
  );
}

function LegendSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-stone-700">{title}</h2>
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4">
        {children}
      </div>
    </section>
  );
}

function LegendRow({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
    </div>
  );
}
