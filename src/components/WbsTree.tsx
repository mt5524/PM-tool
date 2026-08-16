"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskNode } from "@/lib/wbs";
import { findWbsNode, reorderWbsSiblings } from "@/lib/wbs";
import { TaskDialog } from "./TaskDialog";
import { DeleteButton } from "./DeleteButton";
import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusSelect } from "./TaskStatusSelect";
import { deleteTask, reorderSiblingTasks } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";

export function WbsTree({
  nodes,
  projectId,
  taskOptions,
}: {
  nodes: TaskNode[];
  projectId: string;
  taskOptions: { id: string; title: string }[];
}) {
  const [tree, setTree] = useState(nodes);
  // Keep local drag state in sync whenever the server data changes (e.g.
  // after a task is added/edited elsewhere and the page re-fetches). Adjusting
  // state during render (rather than in an effect) avoids an extra commit.
  const [prevNodes, setPrevNodes] = useState(nodes);
  if (nodes !== prevNodes) {
    setPrevNodes(nodes);
    setTree(nodes);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeNode = findWbsNode(tree, String(active.id));
    const overNode = findWbsNode(tree, String(over.id));
    // Reordering is scoped to siblings only — dropping onto a task under a
    // different parent is a no-op (the row springs back to where it was).
    if (!activeNode || !overNode || activeNode.parentId !== overNode.parentId) return;

    const { tree: nextTree, orderedIds } = reorderWbsSiblings(
      tree,
      activeNode.parentId,
      String(active.id),
      String(over.id),
    );
    setTree(nextTree);
    reorderSiblingTasks(projectId, activeNode.parentId, orderedIds);
  }

  if (tree.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        タスクがありません。カンバンボードまたは上のボタンからタスクを追加してください。
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <WbsLevel nodes={tree} projectId={projectId} taskOptions={taskOptions} depth={0} />
    </DndContext>
  );
}

function WbsLevel({
  nodes,
  projectId,
  taskOptions,
  depth,
}: {
  nodes: TaskNode[];
  projectId: string;
  taskOptions: { id: string; title: string }[];
  depth: number;
}) {
  return (
    <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
      <ul
        className={
          depth === 0
            ? "flex flex-col gap-1"
            : "ml-3 mt-1 flex flex-col gap-1 border-l border-stone-200 pl-3"
        }
      >
        {nodes.map((node) => (
          <SortableWbsRow
            key={node.id}
            node={node}
            projectId={projectId}
            taskOptions={taskOptions}
            depth={depth}
          />
        ))}
      </ul>
    </SortableContext>
  );
}

function SortableWbsRow({
  node,
  projectId,
  taskOptions,
  depth,
}: {
  node: TaskNode;
  projectId: string;
  taskOptions: { id: string; title: string }[];
  depth: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded text-stone-300 hover:text-stone-500 active:cursor-grabbing"
          aria-label="ドラッグして並び替え"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="w-12 shrink-0 font-mono text-xs text-stone-400">{node.wbsCode}</span>
        <span className="flex-1 truncate text-sm text-stone-800">{node.title}</span>
        {node.isAiDraft && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
            AI下書き
          </span>
        )}
        <TaskStatusSelect taskId={node.id} projectId={projectId} status={node.status} />
        <PriorityBadge priority={node.priority} />
        {node.dueDate && (
          <span className="hidden text-xs text-stone-400 md:inline">{formatDate(node.dueDate)}</span>
        )}
        <span className="flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100">
          <TaskDialog
            projectId={projectId}
            task={node}
            taskOptions={taskOptions}
            trigger={<span className="cursor-pointer text-amber-700 hover:underline">編集</span>}
          />
          <DeleteButton
            action={deleteTask.bind(null, node.id, projectId)}
            label="削除"
            className="text-red-500 hover:underline"
          />
        </span>
      </div>
      {node.children.length > 0 && (
        <WbsLevel
          nodes={node.children}
          projectId={projectId}
          taskOptions={taskOptions}
          depth={depth + 1}
        />
      )}
    </li>
  );
}
