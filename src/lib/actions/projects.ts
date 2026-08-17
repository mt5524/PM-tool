"use server";

import { prisma } from "@/lib/prisma";
import { parseDate, parseOptionalString } from "@/lib/forms";
import { ProjectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("プロジェクト名は必須です");

  const project = await prisma.project.create({
    data: {
      name,
      description: parseOptionalString(formData.get("description")),
      status: (formData.get("status") as ProjectStatus) || ProjectStatus.PLANNING,
      startDate: parseDate(formData.get("startDate")),
      endDate: parseDate(formData.get("endDate")),
    },
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("プロジェクト名は必須です");

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      description: parseOptionalString(formData.get("description")),
      status: (formData.get("status") as ProjectStatus) || ProjectStatus.PLANNING,
      startDate: parseDate(formData.get("startDate")),
      endDate: parseDate(formData.get("endDate")),
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/");
  redirect("/");
}

/** One-click archive/unarchive, without going through the full settings form. */
export async function setProjectArchived(projectId: string, archived: boolean) {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: archived ? ProjectStatus.ARCHIVED : ProjectStatus.ACTIVE },
  });
  revalidatePath("/");
  revalidatePath("/archived");
  revalidatePath(`/projects/${projectId}`);
}
