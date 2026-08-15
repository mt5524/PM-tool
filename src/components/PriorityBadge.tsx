import type { Priority } from "@prisma/client";
import { priorityColors, priorityLabels } from "@/lib/labels";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${priorityColors[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}
