"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@prisma/client";
import { taskStatusLabels, taskStatusOrder } from "@/lib/labels";
import { moveTask } from "@/lib/actions/tasks";
import { SortableTaskCard } from "./SortableTaskCard";
import { TaskCard } from "./TaskCard";
import { TaskDialog } from "./TaskDialog";

type ColumnsState = Record<TaskStatus, Task[]>;

function groupByStatus(tasks: Task[]): ColumnsState {
  const cols = Object.fromEntries(
    taskStatusOrder.map((s) => [s, [] as Task[]]),
  ) as ColumnsState;
  for (const t of [...tasks].sort((a, b) => a.order - b.order)) {
    cols[t.status].push(t);
  }
  return cols;
}

export function KanbanBoard({
  projectId,
  tasks,
  taskOptions,
}: {
  projectId: string;
  tasks: Task[];
  taskOptions: { id: string; title: string }[];
}) {
  const [columns, setColumns] = useState<ColumnsState>(() => groupByStatus(tasks));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Keep local drag state in sync whenever the server data changes (e.g.
  // after edits). Adjusting state during render (rather than in an effect)
  // avoids an extra commit.
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setColumns(groupByStatus(tasks));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function findColumnOf(id: UniqueIdentifier): TaskStatus | undefined {
    if ((taskStatusOrder as string[]).includes(String(id))) return id as TaskStatus;
    return taskStatusOrder.find((s) => columns[s].some((t) => t.id === id));
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeCol = findColumnOf(active.id);
    const overCol = findColumnOf(over.id);
    if (!activeCol || !overCol || activeCol === overCol) return;

    setColumns((prev) => {
      const activeItems = prev[activeCol];
      const overItems = prev[overCol];
      const activeIndex = activeItems.findIndex((t) => t.id === active.id);
      if (activeIndex === -1) return prev;
      const moved = activeItems[activeIndex];
      const overIndex = overItems.findIndex((t) => t.id === over.id);
      const newOverItems = [...overItems];
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      newOverItems.splice(insertAt, 0, { ...moved, status: overCol });

      return {
        ...prev,
        [activeCol]: activeItems.filter((t) => t.id !== active.id),
        [overCol]: newOverItems,
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeCol = findColumnOf(active.id);
    const overCol = findColumnOf(over.id);
    if (!activeCol || !overCol) return;

    let finalColumns = columns;
    if (activeCol === overCol) {
      const items = columns[activeCol];
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        finalColumns = { ...columns, [activeCol]: arrayMove(items, oldIndex, newIndex) };
        setColumns(finalColumns);
      }
    }

    const orderedIds = finalColumns[overCol].map((t) => t.id);
    moveTask(projectId, String(active.id), overCol, orderedIds);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {taskStatusOrder.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            projectId={projectId}
            taskOptions={taskOptions}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} projectId={projectId} taskOptions={taskOptions} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  projectId,
  taskOptions,
}: {
  status: TaskStatus;
  tasks: Task[];
  projectId: string;
  taskOptions: { id: string; title: string }[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex flex-col rounded-lg border bg-stone-50 ${
        isOver ? "border-amber-400" : "border-stone-200"
      }`}
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <h3 className="text-sm font-medium text-stone-700">{taskStatusLabels[status]}</h3>
        <span className="text-xs text-stone-400">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              taskOptions={taskOptions}
            />
          ))}
        </div>
      </SortableContext>
      <div className="border-t border-stone-200 p-2">
        <TaskDialog
          projectId={projectId}
          defaultStatus={status}
          taskOptions={taskOptions}
          trigger={<span className="text-sm text-amber-700 hover:underline">+ タスク追加</span>}
        />
      </div>
    </div>
  );
}
