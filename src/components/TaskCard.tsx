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
      className={`rounded-lg border border-stone-200 bg-white p-3.5 shadow-sm ${
        dragging ? "rotate-1 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-stone-300 hover:text-stone-500 active:cursor-grabbing"
          aria-label="ドラッグして移動"
          {...(dragHandleProps?.attributes ?? {})}
          {...(dragHandleProps?.listeners ?? {})}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-stone-800">
            {task.title}
            {task.referenceUrl && (
              <a
                href={task.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="参照URLを開く"
                className="ml-1.5 text-stone-400 hover:text-amber-700"
              >
                🔗
              </a>
            )}
          </p>
          {task.dueDate && (
            <p className="mt-0.5 text-xs text-stone-400">期限: {formatDate(task.dueDate)}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.assignee && <span className="text-xs text-stone-500">👤 {task.assignee}</span>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-stone-100 pt-2 text-xs">
        <TaskDialog
          projectId={projectId}
          task={task}
          taskOptions={taskOptions}
          trigger={<span className="cursor-pointer text-amber-700 hover:underline">編集</span>}
        />
        <DeleteButton
          action={deleteTask.bind(null, task.id, projectId)}
          label="削除"
          className="text-red-500 hover:underline"
        />
      </div>
    </div>
  );
}
