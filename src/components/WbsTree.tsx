import type { TaskNode } from "@/lib/wbs";
import { TaskDialog } from "./TaskDialog";
import { DeleteButton } from "./DeleteButton";
import { PriorityBadge } from "./PriorityBadge";
import { deleteTask } from "@/lib/actions/tasks";
import { taskStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export function WbsTree({
  nodes,
  projectId,
  taskOptions,
  depth = 0,
}: {
  nodes: TaskNode[];
  projectId: string;
  taskOptions: { id: string; title: string }[];
  depth?: number;
}) {
  if (depth === 0 && nodes.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        タスクがありません。カンバンボードまたは上のボタンからタスクを追加してください。
      </p>
    );
  }

  return (
    <ul
      className={
        depth === 0
          ? "flex flex-col gap-1"
          : "ml-3 mt-1 flex flex-col gap-1 border-l border-neutral-200 pl-3"
      }
    >
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-neutral-50">
            <span className="w-12 shrink-0 font-mono text-xs text-neutral-400">{node.wbsCode}</span>
            <span className="flex-1 truncate text-sm text-neutral-800">{node.title}</span>
            <span className="hidden text-xs text-neutral-400 sm:inline">
              {taskStatusLabels[node.status]}
            </span>
            <PriorityBadge priority={node.priority} />
            {node.dueDate && (
              <span className="hidden text-xs text-neutral-400 md:inline">
                {formatDate(node.dueDate)}
              </span>
            )}
            <span className="flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100">
              <TaskDialog
                projectId={projectId}
                task={node}
                taskOptions={taskOptions}
                trigger={<span className="cursor-pointer text-sky-600 hover:underline">編集</span>}
              />
              <DeleteButton
                action={deleteTask.bind(null, node.id, projectId)}
                confirmText={`「${node.title}」を削除しますか?(子タスクも削除されます)`}
                label="削除"
                className="text-red-500 hover:underline"
              />
            </span>
          </div>
          {node.children.length > 0 && (
            <WbsTree
              nodes={node.children}
              projectId={projectId}
              taskOptions={taskOptions}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
