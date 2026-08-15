"use client";

import { useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Milestone } from "@prisma/client";
import { createMilestone, updateMilestone } from "@/lib/actions/milestones";
import { toDateInputValue } from "@/lib/forms";

export function MilestoneDialog({
  projectId,
  milestone,
  trigger,
}: {
  projectId: string;
  milestone?: Milestone;
  trigger: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        if (milestone) {
          await updateMilestone(milestone.id, projectId, formData);
        } else {
          await createMilestone(projectId, formData);
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
        className="w-[min(28rem,92vw)] rounded-lg p-0 backdrop:bg-black/40"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {milestone ? "マイルストーンを編集" : "マイルストーンを追加"}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          </div>

          <label className="text-sm">
            名前
            <input
              name="name"
              required
              autoFocus
              defaultValue={milestone?.name}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            日付
            <input
              type="date"
              name="date"
              required
              defaultValue={toDateInputValue(milestone?.date)}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            説明
            <textarea
              name="description"
              defaultValue={milestone?.description ?? ""}
              rows={2}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {pending ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
