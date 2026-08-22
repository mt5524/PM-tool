import { Priority, ProjectStatus, TaskStatus } from "@prisma/client";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNING: "計画中",
  ACTIVE: "進行中",
  ON_HOLD: "保留",
  COMPLETED: "完了",
  ARCHIVED: "アーカイブ",
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  PLANNING: "bg-stone-100 text-stone-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-teal-100 text-teal-700",
  ARCHIVED: "bg-stone-200 text-stone-500",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  REVIEW: "レビュー",
  DONE: "完了",
};

export const taskStatusOrder: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];

// Badge (background/text) colors — used for status pills.
export const taskStatusColors: Record<TaskStatus, string> = {
  TODO: "bg-stone-100 text-stone-600",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  REVIEW: "bg-purple-100 text-purple-700",
  DONE: "bg-emerald-100 text-emerald-700",
};

// Solid fill colors — used for Gantt/WBS timeline bars (needs a stronger,
// non-transparent shade to read well against the day-grid background).
export const taskStatusBarColors: Record<TaskStatus, string> = {
  TODO: "bg-stone-300",
  IN_PROGRESS: "bg-amber-400",
  REVIEW: "bg-purple-400",
  DONE: "bg-emerald-400",
};

export const priorityLabels: Record<Priority, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "緊急",
};

export const priorityColors: Record<Priority, string> = {
  LOW: "bg-stone-100 text-stone-600",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};
