"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  extractTasksPreview,
  extractMilestonesPreview,
  commitTasksFromPreview,
  commitMilestonesFromPreview,
} from "@/lib/actions/import";
import type { ExtractedTask, ExtractedMilestone } from "@/lib/ai/document-import";
import { priorityLabels } from "@/lib/labels";

type Phase = "input" | "preview";
type ExistingTaskInfo = { title: string; childCount: number };

export function ImportDialog({
  projectId,
  mode,
  trigger,
}: {
  projectId: string;
  mode: "tasks" | "milestones";
  trigger: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [previewTasks, setPreviewTasks] = useState<ExtractedTask[]>([]);
  const [deleteTaskIds, setDeleteTaskIds] = useState<string[]>([]);
  const [existingTaskInfo, setExistingTaskInfo] = useState<Map<string, ExistingTaskInfo>>(
    new Map(),
  );
  const [previewMilestones, setPreviewMilestones] = useState<ExtractedMilestone[]>([]);
  const [deleteMilestoneIds, setDeleteMilestoneIds] = useState<string[]>([]);
  const [existingMilestoneNames, setExistingMilestoneNames] = useState<Map<string, string>>(
    new Map(),
  );

  const label = mode === "tasks" ? "タスク" : "マイルストーン";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleExtract(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "tasks") {
          const { tasks, deleteTaskIds: delIds, existingTasks } = await extractTasksPreview(
            projectId,
            text,
          );
          if (tasks.length === 0 && delIds.length === 0) {
            setError("文書からタスクの追加・更新・削除を抽出できませんでした。内容を確認してください。");
            return;
          }
          setPreviewTasks(tasks);
          setDeleteTaskIds(delIds);
          setExistingTaskInfo(
            new Map(existingTasks.map((t) => [t.id, { title: t.title, childCount: t.childCount }])),
          );
        } else {
          const {
            milestones,
            deleteMilestoneIds: delIds,
            existingMilestones,
          } = await extractMilestonesPreview(projectId, text);
          if (milestones.length === 0 && delIds.length === 0) {
            setError(
              "文書からマイルストーンの追加・更新・削除を抽出できませんでした。内容を確認してください。",
            );
            return;
          }
          setPreviewMilestones(milestones);
          setDeleteMilestoneIds(delIds);
          setExistingMilestoneNames(new Map(existingMilestones.map((m) => [m.id, m.name])));
        }
        setPhase("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  }

  function handleCommit() {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "tasks") {
          const { created, updated, deleted } = await commitTasksFromPreview(
            projectId,
            previewTasks,
            deleteTaskIds,
          );
          setResult(`反映しました(新規 ${created}件・更新 ${updated}件・削除 ${deleted}件)。`);
        } else {
          const { created, updated, skipped, deleted } = await commitMilestonesFromPreview(
            projectId,
            previewMilestones,
            deleteMilestoneIds,
          );
          setResult(
            `反映しました(新規 ${created}件・更新 ${updated}件・削除 ${deleted}件)。` +
              (skipped ? `(日付が不明で${skipped}件をスキップ)` : ""),
          );
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  }

  function reset() {
    setPhase("input");
    setText("");
    setError(null);
    setResult(null);
    setPreviewTasks([]);
    setDeleteTaskIds([]);
    setPreviewMilestones([]);
    setDeleteMilestoneIds([]);
  }

  function handleClose() {
    dialogRef.current?.close();
    reset();
  }

  const taskCreateCount = previewTasks.filter((t) => !t.existingTaskId).length;
  const taskUpdateCount = previewTasks.filter((t) => t.existingTaskId).length;
  const milestoneCreateCount = previewMilestones.filter((m) => !m.existingMilestoneId).length;
  const milestoneUpdateCount = previewMilestones.filter((m) => m.existingMilestoneId).length;

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="contents">
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className="w-[min(36rem,92vw)] rounded-xl p-0 shadow-xl backdrop:bg-stone-900/30"
      >
        <div className="flex max-h-[85vh] flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              文書から{label}を{phase === "input" ? "インポート" : "反映"}
            </h2>
            <button type="button" onClick={handleClose} className="text-stone-400 hover:text-stone-600">
              ✕
            </button>
          </div>

          {phase === "input" && (
            <form onSubmit={handleExtract} className="flex flex-col gap-3">
              <p className="text-xs text-stone-500">
                テキスト/Markdown文書を貼り付けるか、ファイルを選択してください。AIが内容を解析し、
                新規{label}の追加案・既存{label}の更新案・削除案を作成します(内容を確認してから反映します)。
              </p>

              <label className="text-sm">
                ファイルから読み込む(.txt / .md)
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={handleFileChange}
                  className="mt-1 w-full text-sm"
                />
              </label>

              <label className="text-sm">
                文書テキスト
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  rows={10}
                  placeholder="ここに文書を貼り付けてください..."
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                >
                  閉じる
                </button>
                <button
                  type="submit"
                  disabled={pending || !text.trim()}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {pending ? "AIが解析中..." : "内容を確認"}
                </button>
              </div>
            </form>
          )}

          {phase === "preview" && !result && (
            <div className="flex min-h-0 flex-col gap-3">
              <p className="text-sm text-stone-700">
                以下の内容で{label}に反映します。よろしいですか?
                <span className="ml-1 text-xs text-stone-500">
                  {mode === "tasks"
                    ? `(新規 ${taskCreateCount}件・更新 ${taskUpdateCount}件・削除 ${deleteTaskIds.length}件)`
                    : `(新規 ${milestoneCreateCount}件・更新 ${milestoneUpdateCount}件・削除 ${deleteMilestoneIds.length}件)`}
                </span>
              </p>

              <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto rounded-lg border border-stone-200 p-2">
                {mode === "tasks" ? (
                  <>
                    {deleteTaskIds.map((id) => {
                      const info = existingTaskInfo.get(id);
                      return (
                        <li
                          key={`del-${id}`}
                          className="flex items-start gap-2 rounded-md bg-red-50/50 px-2 py-1.5 text-sm"
                        >
                          <span className="mt-0.5 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            削除
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-stone-800">
                              {info?.title ?? id}
                            </span>
                            {info && info.childCount > 0 && (
                              <span className="block text-xs text-red-600">
                                子タスク{info.childCount}件も一緒に削除されます
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                    {previewTasks.map((t) => (
                      <li
                        key={t.tempId}
                        className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-stone-50"
                      >
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            t.existingTaskId
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {t.existingTaskId ? "更新" : "新規"}
                        </span>
                        <span className="min-w-0 flex-1">
                          {t.existingTaskId &&
                            existingTaskInfo.get(t.existingTaskId)?.title !== t.title && (
                              <span className="block truncate text-xs text-stone-400 line-through">
                                {existingTaskInfo.get(t.existingTaskId)?.title}
                              </span>
                            )}
                          <span className="block truncate text-stone-800">{t.title}</span>
                        </span>
                        <span className="shrink-0 text-xs text-stone-400">
                          {priorityLabels[t.priority]}
                        </span>
                      </li>
                    ))}
                  </>
                ) : (
                  <>
                    {deleteMilestoneIds.map((id) => (
                      <li
                        key={`del-${id}`}
                        className="flex items-start gap-2 rounded-md bg-red-50/50 px-2 py-1.5 text-sm"
                      >
                        <span className="mt-0.5 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          削除
                        </span>
                        <span className="min-w-0 flex-1 truncate text-stone-800">
                          {existingMilestoneNames.get(id) ?? id}
                        </span>
                      </li>
                    ))}
                    {previewMilestones.map((m) => (
                      <li
                        key={m.tempId}
                        className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-stone-50"
                      >
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            m.existingMilestoneId
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {m.existingMilestoneId ? "更新" : "新規"}
                        </span>
                        <span className="min-w-0 flex-1">
                          {m.existingMilestoneId &&
                            existingMilestoneNames.get(m.existingMilestoneId) !== m.name && (
                              <span className="block truncate text-xs text-stone-400 line-through">
                                {existingMilestoneNames.get(m.existingMilestoneId)}
                              </span>
                            )}
                          <span className="block truncate text-stone-800">{m.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-stone-400">{m.date}</span>
                      </li>
                    ))}
                  </>
                )}
              </ul>

              {((mode === "tasks" && deleteTaskIds.length > 0) ||
                (mode === "milestones" && deleteMilestoneIds.length > 0)) && (
                <p className="text-xs text-red-600">
                  ⚠ 削除は反映すると元に戻せません。内容をよくご確認ください。
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  disabled={pending}
                  className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={pending}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {pending ? "反映中..." : "この内容で反映する"}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-emerald-600">{result}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-200"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
