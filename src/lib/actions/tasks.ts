"use server";

import { prisma } from "@/lib/prisma";
import { parseDate, parseOptionalString } from "@/lib/forms";
import { Priority, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createTask(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("タスク名は必須です");

  const status = (formData.get("status") as TaskStatus) || TaskStatus.TODO;

  const maxOrder = await prisma.task.aggregate({
    where: { projectId, status },
    _max: { order: true },
  });

  await prisma.task.create({
    data: {
      projectId,
      parentId: parseOptionalString(formData.get("parentId")),
      title,
      description: parseOptionalString(formData.get("description")),
      status,
      priority: (formData.get("priority") as Priority) || Priority.MEDIUM,
      startDate: parseDate(formData.get("startDate")),
      dueDate: parseDate(formData.get("dueDate")),
      assignee: parseOptionalString(formData.get("assignee")),
      referenceUrl: parseOptionalString(formData.get("referenceUrl")),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateTask(taskId: string, projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("タスク名は必須です");

  const parentId = parseOptionalString(formData.get("parentId"));
  if (parentId === taskId) throw new Error("自分自身を親タスクにはできません");

  await prisma.task.update({
    where: { id: taskId },
    data: {
      parentId,
      title,
      description: parseOptionalString(formData.get("description")),
      status: (formData.get("status") as TaskStatus) || TaskStatus.TODO,
      priority: (formData.get("priority") as Priority) || Priority.MEDIUM,
      startDate: parseDate(formData.get("startDate")),
      dueDate: parseDate(formData.get("dueDate")),
      assignee: parseOptionalString(formData.get("assignee")),
      referenceUrl: parseOptionalString(formData.get("referenceUrl")),
      // Editing and saving is treated as human review/confirmation.
      isAiDraft: false,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

/** Quick one-click status change (e.g. from the WBS row), without opening the full edit dialog. */
export async function updateTaskStatus(taskId: string, projectId: string, status: TaskStatus) {
  await prisma.task.update({
    where: { id: taskId },
    data: { status, isAiDraft: false },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(taskId: string, projectId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Called from the WBS tree after a drag-and-drop reorder within the same
 * parent (siblings only — reparenting via drag is not supported).
 * `orderedIds` is the full, final ordering of the sibling tasks under `parentId`.
 */
export async function reorderSiblingTasks(
  projectId: string,
  parentId: string | null,
  orderedIds: string[],
) {
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.task.update({ where: { id }, data: { order: index } })),
  );
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Called from the Kanban board after a drag-and-drop action.
 * `orderedIds` is the full, final ordering of task ids within the destination column
 * (including the moved task), used to persist both status and order in one go.
 */
export async function moveTask(
  projectId: string,
  taskId: string,
  newStatus: TaskStatus,
  orderedIds: string[],
) {
  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { status: newStatus } }),
    ...orderedIds.map((id, index) =>
      prisma.task.update({ where: { id }, data: { order: index } }),
    ),
  ]);
  revalidatePath(`/projects/${projectId}`);
}
