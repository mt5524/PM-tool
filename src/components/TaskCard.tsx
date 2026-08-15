import type { Task } from "@prisma/client";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { TaskDialog } from "./TaskDialog";
import { DeleteButton } from "./DeleteButton";
import { PriorityBadge } from "./PriorityBadge";
import { deleteTask } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";

export function TaskCard({
  task,
  projectId,
  taskOptions,
  dragHandleProps,
  dragging,
}: {
  task: Task;
  projectId: string;
  taskOptions: { id: string; title: string }[];
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: DraggableSyntheticListeners;
  };
  dragging?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-neutral-200 bg-white p-3 shadow-sm ${
        dragging ? "rotate-1 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
          aria-label="ドラッグして移動"
          {...(dragHandleProps?.attributes ?? {})}
          {...(dragHandleProps?.listeners ?? {})}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-neutral-800">{task.title}</p>
          {task.dueDate && (
            <p className="mt-0.5 text-xs text-neutral-400">期限: {formatDate(task.dueDate)}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.assignee && <span className="text-xs text-neutral-500">👤 {task.assignee}</span>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-neutral-100 pt-2 text-xs">
        <TaskDialog
          projectId={projectId}
          task={task}
          taskOptions={taskOptions}
          trigger={<span className="cursor-pointer text-sky-600 hover:underline">編集</span>}
        />
        <DeleteButton
          action={deleteTask.bind(null, task.id, projectId)}
          confirmText={`「${task.title}」を削除しますか?`}
          label="削除"
          className="text-red-500 hover:underline"
        />
      </div>
    </div>
  );
}
