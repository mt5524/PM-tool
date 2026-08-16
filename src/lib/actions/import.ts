"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  extractTasksFromDocument,
  extractMilestonesFromDocument,
  toPriorityEnum,
  type ExtractedTask,
  type ExtractedMilestone,
} from "@/lib/ai/document-import";

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * Step 1 of the two-step import flow: calls the AI to extract proposed
 * tasks (creates, updates to existing tasks, and/or deletions) from a
 * document, WITHOUT writing anything to the database yet. The caller shows
 * this as a preview and only calls `commitTasksFromPreview` once the user
 * approves it.
 */
export async function extractTasksPreview(projectId: string, docText: string) {
  const text = docText.trim();
  if (!text) throw new Error("文書のテキストを入力してください");

  const existing = await prisma.task.findMany({
    where: { projectId },
    select: { id: true, title: true, parentId: true, description: true, priority: true },
  });
  const childCountByParentId = new Map<string, number>();
  for (const t of existing) {
    if (t.parentId) childCountByParentId.set(t.parentId, (childCountByParentId.get(t.parentId) ?? 0) + 1);
  }

  const { tasks, deleteTaskIds } = await extractTasksFromDocument(text, existing);
  return {
    tasks,
    deleteTaskIds,
    existingTasks: existing.map((t) => ({
      id: t.id,
      title: t.title,
      childCount: childCountByParentId.get(t.id) ?? 0,
    })),
  };
}

/**
 * Step 2: the user has reviewed the preview and approved it (or approved it
 * unchanged) — actually create/update/delete the tasks. Items with
 * `existingTaskId` set are updates (and re-flagged isAiDraft for review,
 * same as a create); everything else is a new task. `parentRef` may point
 * at another item's `tempId` in this same batch, or at a real existing task
 * id. `deleteTaskIds` are removed outright (cascades to their subtasks).
 */
export async function commitTasksFromPreview(
  projectId: string,
  tasks: ExtractedTask[],
  deleteTaskIds: string[] = [],
) {
  let deleted = 0;
  if (deleteTaskIds.length > 0) {
    const result = await prisma.task.deleteMany({
      where: { id: { in: deleteTaskIds }, projectId },
    });
    deleted = result.count;
  }

  if (tasks.length === 0) {
    revalidatePath(`/projects/${projectId}`);
    return { created: 0, updated: 0, deleted };
  }

  const existingIds = new Set(
    (await prisma.task.findMany({ where: { projectId }, select: { id: true } })).map((t) => t.id),
  );

  const maxOrder = await prisma.task.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  const tempIds = new Set(tasks.map((t) => t.tempId));
  const byParentRef = new Map<string | null, ExtractedTask[]>();
  for (const t of tasks) {
    const key = t.parentRef;
    if (!byParentRef.has(key)) byParentRef.set(key, []);
    byParentRef.get(key)!.push(t);
  }

  const idMap = new Map<string, string>(); // tempId -> real db id
  let created = 0;
  let updated = 0;

  async function upsert(t: ExtractedTask, dbParentId: string | null): Promise<string> {
    const isUpdate = Boolean(t.existingTaskId && existingIds.has(t.existingTaskId));
    if (isUpdate) {
      await prisma.task.update({
        where: { id: t.existingTaskId! },
        data: {
          parentId: dbParentId,
          title: t.title,
          description: t.description ?? undefined,
          priority: toPriorityEnum(t.priority),
          isAiDraft: true,
        },
      });
      updated++;
      return t.existingTaskId!;
    }
    const row = await prisma.task.create({
      data: {
        projectId,
        parentId: dbParentId,
        title: t.title,
        description: t.description ?? undefined,
        priority: toPriorityEnum(t.priority),
        order: nextOrder++,
        isAiDraft: true,
      },
    });
    created++;
    return row.id;
  }

  async function walk(groupKey: string | null, dbParentId: string | null) {
    for (const t of byParentRef.get(groupKey) ?? []) {
      const dbId = await upsert(t, dbParentId);
      idMap.set(t.tempId, dbId);
      await walk(t.tempId, dbId);
    }
  }

  // Top-level items (parentRef === null).
  await walk(null, null);

  // Groups anchored to a real existing task that isn't itself part of this
  // batch (e.g. "add these 3 subtasks under the existing 'Design' task").
  for (const [key] of byParentRef) {
    if (key !== null && !tempIds.has(key) && existingIds.has(key)) {
      await walk(key, key);
    }
  }

  // Anything left over references a parent we couldn't resolve (a hallucinated
  // or stale id) — insert as top-level rather than silently dropping it.
  for (const [key, group] of byParentRef) {
    if (key !== null && !tempIds.has(key) && !existingIds.has(key)) {
      for (const t of group) {
        if (idMap.has(t.tempId)) continue;
        const dbId = await upsert(t, null);
        idMap.set(t.tempId, dbId);
        await walk(t.tempId, dbId);
      }
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { created, updated, deleted };
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function extractMilestonesPreview(projectId: string, docText: string) {
  const text = docText.trim();
  if (!text) throw new Error("文書のテキストを入力してください");

  const existing = await prisma.milestone.findMany({
    where: { projectId },
    select: { id: true, name: true, date: true, description: true },
  });

  const { milestones, deleteMilestoneIds } = await extractMilestonesFromDocument(text, existing);
  return {
    milestones,
    deleteMilestoneIds,
    existingMilestones: existing.map((m) => ({ id: m.id, name: m.name })),
  };
}

export async function commitMilestonesFromPreview(
  projectId: string,
  milestones: ExtractedMilestone[],
  deleteMilestoneIds: string[] = [],
) {
  let deleted = 0;
  if (deleteMilestoneIds.length > 0) {
    const result = await prisma.milestone.deleteMany({
      where: { id: { in: deleteMilestoneIds }, projectId },
    });
    deleted = result.count;
  }

  if (milestones.length === 0) {
    revalidatePath(`/projects/${projectId}`);
    return { created: 0, updated: 0, skipped: 0, deleted };
  }

  const existingIds = new Set(
    (await prisma.milestone.findMany({ where: { projectId }, select: { id: true } })).map(
      (m) => m.id,
    ),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const m of milestones) {
    const date = new Date(m.date);
    if (Number.isNaN(date.getTime())) {
      skipped++;
      continue;
    }
    const isUpdate = Boolean(m.existingMilestoneId && existingIds.has(m.existingMilestoneId));
    if (isUpdate) {
      await prisma.milestone.update({
        where: { id: m.existingMilestoneId! },
        data: {
          name: m.name,
          date,
          description: m.description ?? undefined,
          isAiDraft: true,
        },
      });
      updated++;
    } else {
      await prisma.milestone.create({
        data: {
          projectId,
          name: m.name,
          date,
          description: m.description ?? undefined,
          isAiDraft: true,
        },
      });
      created++;
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { created, updated, skipped, deleted };
}
