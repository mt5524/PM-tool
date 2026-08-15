"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@prisma/client";
import { TaskCard } from "./TaskCard";

export function SortableTaskCard({
  task,
  projectId,
  taskOptions,
}: {
  task: Task;
  projectId: string;
  taskOptions: { id: string; title: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        projectId={projectId}
        taskOptions={taskOptions}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}
