"use client";

import { useTransition } from "react";
import type { TaskStatus } from "@prisma/client";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { taskStatusLabels, taskStatusOrder } from "@/lib/labels";

/** One-click status change (no need to open the full edit dialog). */
export function TaskStatusSelect({
  taskId,
  projectId,
  status,
}: {
  taskId: string;
  projectId: string;
  status: TaskStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as TaskStatus;
        startTransition(async () => {
          await updateTaskStatus(taskId, projectId, next);
        });
      }}
      className="hidden shrink-0 rounded-md border-none bg-transparent px-1 py-0.5 text-xs text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50 sm:inline-block"
    >
      {taskStatusOrder.map((s) => (
        <option key={s} value={s}>
          {taskStatusLabels[s]}
        </option>
      ))}
    </select>
  );
}
