"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  extractTasksFromDocument,
  extractMilestonesFromDocument,
  toPriorityEnum,
} from "@/lib/ai/document-import";

/**
 * 文書テキストをAIでWBSタスクに変換し、下書き(isAiDraft: true)として一括作成する。
 * 親子関係は抽出結果のtempId/parentTempIdから解決し、親→子の順で挿入する。
 */
export async function importTasksFromText(projectId: string, docText: string) {
  const text = docText.trim();
  if (!text) throw new Error("文書のテキストを入力してください");

  const extracted = await extractTasksFromDocument(text);
  if (extracted.length === 0) {
    return { count: 0 };
  }

  const maxOrder = await prisma.task.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  const byParent = new Map<string | null, typeof extracted>();
  for (const t of extracted) {
    const key = t.parentTempId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }

  let created = 0;
  async function insertLevel(parentTempId: string | null, dbParentId: string | null) {
    for (const t of byParent.get(parentTempId) ?? []) {
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
      await insertLevel(t.tempId, row.id);
    }
  }
  // Tasks whose declared parentTempId doesn't match any tempId in the batch
  // (typo, or the AI referenced a task that doesn't exist) are treated as
  // top-level rather than silently dropped.
  const knownIds = new Set(extracted.map((t) => t.tempId));
  for (const t of extracted) {
    if (t.parentTempId && !knownIds.has(t.parentTempId)) {
      const top = byParent.get(null) ?? [];
      byParent.set(null, [...top, t]);
      byParent.set(t.parentTempId, (byParent.get(t.parentTempId) ?? []).filter((x) => x !== t));
    }
  }
  await insertLevel(null, null);

  revalidatePath(`/projects/${projectId}`);
  return { count: created };
}

/** 文書テキストをAIでマイルストーンに変換し、下書き(isAiDraft: true)として一括作成する。 */
export async function importMilestonesFromText(projectId: string, docText: string) {
  const text = docText.trim();
  if (!text) throw new Error("文書のテキストを入力してください");

  const extracted = await extractMilestonesFromDocument(text);
  if (extracted.length === 0) {
    return { count: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;
  for (const m of extracted) {
    const date = new Date(m.date);
    if (Number.isNaN(date.getTime())) {
      skipped++;
      continue;
    }
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

  revalidatePath(`/projects/${projectId}`);
  return { count: created, skipped };
}
