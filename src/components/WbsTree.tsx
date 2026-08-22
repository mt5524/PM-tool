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
import {
  addDays,
  differenceInCalendarDays,
  eachWeekOfInterval,
  format,
  isWithinInterval,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { TaskNode, FlatTaskNode } from "@/lib/wbs";
import { findWbsNode, reorderWbsSiblings, flattenWbsTreeWithDepth } from "@/lib/wbs";
import { TaskDialog } from "./TaskDialog";
import { DeleteButton } from "./DeleteButton";
import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusSelect } from "./TaskStatusSelect";
import { deleteTask, reorderSiblingTasks } from "@/lib/actions/tasks";
import { taskStatusBarColors, taskStatusLabels } from "@/lib/labels";

const DAY_WIDTH = 20;
const LABEL_WIDTH = 400;
const INDENT_WIDTH = 14;

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

  const flat = flattenWbsTreeWithDepth(tree);

  // Shared day-based timeline, computed across every task that has a date —
  // same approach as GanttChart, so a row's bar lines up under the header.
  const datedNodes = flat.filter((n) => n.startDate || n.dueDate);
  const hasSchedule = datedNodes.length > 0;

  let rangeStart = new Date();
  let totalWidth = 0;
  let weekTicks: Date[] = [];
  let today = new Date();
  let showToday = false;

  if (hasSchedule) {
    const dates = datedNodes.flatMap((n) => [n.startDate, n.dueDate].filter(Boolean) as Date[]);
    rangeStart = addDays(new Date(Math.min(...dates.map((d) => d.getTime()))), -2);
    const rangeEnd = addDays(new Date(Math.max(...dates.map((d) => d.getTime()))), 2);
    const totalDays = Math.max(differenceInCalendarDays(rangeEnd, rangeStart) + 1, 1);
    totalWidth = totalDays * DAY_WIDTH;
    weekTicks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });
    showToday = isWithinInterval(today, { start: rangeStart, end: rangeEnd });
  }

  const xFor = (date: Date) => differenceInCalendarDays(date, rangeStart) * DAY_WIDTH;

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <div style={{ width: hasSchedule ? totalWidth + LABEL_WIDTH : undefined, minWidth: "100%" }}>
        {hasSchedule && (
          <div className="flex border-b border-stone-200 bg-white">
            <div
              className="shrink-0 border-r border-stone-200 px-3 py-2 text-xs font-medium text-stone-500"
              style={{ width: LABEL_WIDTH }}
            >
              タスク
            </div>
            <div className="relative" style={{ width: totalWidth, height: 32 }}>
              {weekTicks.map((d) => (
                <div
                  key={d.toISOString()}
                  className="absolute top-0 h-full border-l border-stone-100 pt-1.5 pl-1 text-[11px] text-stone-400"
                  style={{ left: xFor(d) }}
                >
                  {format(d, "M/d", { locale: ja })}
                </div>
              ))}
            </div>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={flat.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col">
              {flat.map((node) => (
                <WbsRow
                  key={node.id}
                  node={node}
                  projectId={projectId}
                  taskOptions={taskOptions}
                  hasSchedule={hasSchedule}
                  totalWidth={totalWidth}
                  xFor={xFor}
                  showToday={showToday}
                  today={today}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function WbsRow({
  node,
  projectId,
  taskOptions,
  hasSchedule,
  totalWidth,
  xFor,
  showToday,
  today,
}: {
  node: FlatTaskNode;
  projectId: string;
  taskOptions: { id: string; title: string }[];
  hasSchedule: boolean;
  totalWidth: number;
  xFor: (date: Date) => number;
  showToday: boolean;
  today: Date;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const start = node.startDate ?? node.dueDate;
  const end = node.dueDate ?? node.startDate;

  return (
    <li ref={setNodeRef} style={style} className="flex border-b border-stone-100 last:border-b-0">
      <div
        className="group flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50"
        style={{ width: hasSchedule ? LABEL_WIDTH : undefined, paddingLeft: 8 + node.depth * INDENT_WIDTH }}
      >
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
        <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{node.title}</span>
        {node.referenceUrl && (
          <a
            href={node.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="参照URLを開く"
            className="shrink-0 text-stone-400 hover:text-amber-700"
          >
            🔗
          </a>
        )}
        {node.isAiDraft && (
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
            AI下書き
          </span>
        )}
        <TaskStatusSelect taskId={node.id} projectId={projectId} status={node.status} />
        <PriorityBadge priority={node.priority} />
        <span className="flex shrink-0 items-center gap-2 text-xs opacity-0 group-hover:opacity-100">
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

      {hasSchedule && (
        <div className="relative shrink-0" style={{ width: totalWidth }}>
          {showToday && (
            <div className="absolute top-0 h-full border-l border-red-300" style={{ left: xFor(today) }} />
          )}
          {start && end && (
            <div
              className={`absolute top-2 h-4 rounded ${taskStatusBarColors[node.status]}`}
              style={{ left: xFor(start), width: Math.max(xFor(end) - xFor(start) + DAY_WIDTH, DAY_WIDTH) }}
              title={`${node.title} (${taskStatusLabels[node.status]})`}
            />
          )}
        </div>
      )}
    </li>
  );
}
