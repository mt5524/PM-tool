import { addDays, differenceInCalendarDays, eachWeekOfInterval, format, isWithinInterval } from "date-fns";
import { ja } from "date-fns/locale";
import type { Milestone, Task } from "@prisma/client";
import { taskStatusBarColors, taskStatusLabels } from "@/lib/labels";

const DAY_WIDTH = 24;
const LABEL_WIDTH = 220;

export function GanttChart({ tasks, milestones }: { tasks: Task[]; milestones: Milestone[] }) {
  const dates: Date[] = [];
  for (const t of tasks) {
    if (t.startDate) dates.push(t.startDate);
    if (t.dueDate) dates.push(t.dueDate);
  }
  for (const m of milestones) dates.push(m.date);

  if (dates.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        開始日・期限日が設定されたタスクやマイルストーンがありません。タスクやマイルストーンに日付を設定するとここにガントチャートが表示されます。
      </p>
    );
  }

  const rangeStart = addDays(new Date(Math.min(...dates.map((d) => d.getTime()))), -2);
  const rangeEnd = addDays(new Date(Math.max(...dates.map((d) => d.getTime()))), 2);
  const totalDays = Math.max(differenceInCalendarDays(rangeEnd, rangeStart) + 1, 1);
  const totalWidth = totalDays * DAY_WIDTH;
  const weekTicks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });
  const today = new Date();
  const showToday = isWithinInterval(today, { start: rangeStart, end: rangeEnd });

  function xFor(date: Date) {
    return differenceInCalendarDays(date, rangeStart) * DAY_WIDTH;
  }

  const tasksWithDates = tasks.filter((t) => t.startDate || t.dueDate);

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <div style={{ width: totalWidth + LABEL_WIDTH }}>
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

        {tasksWithDates.length === 0 && (
          <p className="px-3 py-4 text-sm text-stone-400">日付が設定されたタスクはありません。</p>
        )}

        {tasksWithDates.map((task) => {
          const start = task.startDate ?? task.dueDate!;
          const end = task.dueDate ?? task.startDate!;
          const left = xFor(start);
          const width = Math.max(xFor(end) - xFor(start) + DAY_WIDTH, DAY_WIDTH);
          return (
            <div key={task.id} className="flex border-b border-stone-100">
              <div
                className="shrink-0 truncate border-r border-stone-200 px-3 py-2.5 text-sm text-stone-700"
                style={{ width: LABEL_WIDTH }}
              >
                {task.title}
              </div>
              <div className="relative" style={{ width: totalWidth, height: 40 }}>
                {showToday && (
                  <div
                    className="absolute top-0 h-full border-l border-red-300"
                    style={{ left: xFor(today) }}
                  />
                )}
                <div
                  className={`absolute top-2 h-5 rounded ${taskStatusBarColors[task.status]}`}
                  style={{ left, width }}
                  title={`${task.title} (${taskStatusLabels[task.status]})`}
                />
              </div>
            </div>
          );
        })}

        {milestones.map((m) => (
          <div key={m.id} className="flex border-b border-stone-100 bg-amber-50/50">
            <div
              className="shrink-0 truncate border-r border-stone-200 px-3 py-2.5 text-sm text-amber-800"
              style={{ width: LABEL_WIDTH }}
            >
              ◆ {m.name}
            </div>
            <div className="relative" style={{ width: totalWidth, height: 40 }}>
              <div
                className="absolute top-2.5 h-3 w-3 rotate-45 bg-amber-500"
                style={{ left: xFor(m.date) - 6 }}
                title={`${m.name} (${format(m.date, "yyyy/MM/dd")})`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
