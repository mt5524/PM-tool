"use server";

import { prisma } from "@/lib/prisma";
import { parseDate, parseOptionalString } from "@/lib/forms";
import { revalidatePath } from "next/cache";

export async function createMilestone(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("マイルストーン名は必須です");
  const date = parseDate(formData.get("date"));
  if (!date) throw new Error("日付は必須です");

  await prisma.milestone.create({
    data: {
      projectId,
      name,
      date,
      description: parseOptionalString(formData.get("description")),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateMilestone(
  milestoneId: string,
  projectId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("マイルストーン名は必須です");
  const date = parseDate(formData.get("date"));
  if (!date) throw new Error("日付は必須です");

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      name,
      date,
      description: parseOptionalString(formData.get("description")),
      // Editing and saving is treated as human review/confirmation.
      isAiDraft: false,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function toggleMilestoneDone(
  milestoneId: string,
  projectId: string,
  done: boolean,
) {
  await prisma.milestone.update({ where: { id: milestoneId }, data: { done } });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMilestone(milestoneId: string, projectId: string) {
  await prisma.milestone.delete({ where: { id: milestoneId } });
  revalidatePath(`/projects/${projectId}`);
}
