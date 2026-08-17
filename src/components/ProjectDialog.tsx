"use client";

import { useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { createProject, updateProject } from "@/lib/actions/projects";
import { Project, ProjectStatus } from "@prisma/client";
import { projectStatusLabels } from "@/lib/labels";
import { toDateInputValue } from "@/lib/forms";

export function ProjectDialog({
  project,
  trigger,
}: {
  project?: Project;
  trigger: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(project);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        if (project) {
          await updateProject(project.id, formData);
          dialogRef.current?.close();
          router.refresh();
        } else {
          await createProject(formData);
        }
      } catch (err) {
        unstable_rethrow(err);
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
        className="w-[min(30rem,92vw)] rounded-xl p-0 shadow-xl backdrop:bg-stone-900/30"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {isEdit ? "プロジェクトを編集" : "新規プロジェクト"}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>

          <label className="text-sm">
            プロジェクト名
            <input
              name="name"
              required
              autoFocus
              defaultValue={project?.name}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            説明
            <textarea
              name="description"
              rows={2}
              defaultValue={project?.description ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            ステータス
            <select
              name="status"
              defaultValue={project?.status ?? ProjectStatus.PLANNING}
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
                defaultValue={toDateInputValue(project?.startDate)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm">
              終了予定日
              <input
                type="date"
                name="endDate"
                defaultValue={toDateInputValue(project?.endDate)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

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
              {pending ? "保存中..." : isEdit ? "保存" : "作成"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
