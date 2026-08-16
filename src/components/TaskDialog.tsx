"use client";

import { useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Priority, type Task, type TaskStatus } from "@prisma/client";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { priorityLabels, taskStatusLabels, taskStatusOrder } from "@/lib/labels";
import { toDateInputValue } from "@/lib/forms";

export function TaskDialog({
  projectId,
  task,
  defaultStatus,
  taskOptions,
  trigger,
}: {
  projectId: string;
  task?: Task;
  defaultStatus?: TaskStatus;
  taskOptions: { id: string; title: string }[];
  trigger: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(task);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        if (task) {
          await updateTask(task.id, projectId, formData);
        } else {
          await createTask(projectId, formData);
        }
        dialogRef.current?.close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="contents">
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className="w-[min(34rem,92vw)] rounded-xl p-0 shadow-xl backdrop:bg-stone-900/30"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{isEdit ? "タスクを編集" : "タスクを追加"}</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>

          <label className="text-sm">
            タイトル
            <input
              name="title"
              required
              defaultValue={task?.title}
              autoFocus
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            説明
            <textarea
              name="description"
              defaultValue={task?.description ?? ""}
              rows={2}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              ステータス
              <select
                name="status"
                defaultValue={task?.status ?? defaultStatus ?? "TODO"}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                {taskStatusOrder.map((s) => (
                  <option key={s} value={s}>
                    {taskStatusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              優先度
              <select
                name="priority"
                defaultValue={task?.priority ?? Priority.MEDIUM}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {priorityLabels[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              開始日
              <input
                type="date"
                name="startDate"
                defaultValue={toDateInputValue(task?.startDate)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm">
              期限日
              <input
                type="date"
                name="dueDate"
                defaultValue={toDateInputValue(task?.dueDate)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="text-sm">
            担当者
            <input
              name="assignee"
              defaultValue={task?.assignee ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            親タスク(WBS)
            <select
              name="parentId"
              defaultValue={task?.parentId ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="">(なし)</option>
              {taskOptions
                .filter((t) => t.id !== task?.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {pending ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
