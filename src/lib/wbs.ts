import type { Task } from "@prisma/client";

export type TaskNode = Task & { children: TaskNode[]; wbsCode: string };

/**
 * Builds a hierarchical WBS tree (with dotted codes like 1, 1.1, 1.2, 2 ...)
 * out of a flat list of tasks that reference each other via parentId.
 * Siblings are ordered by their `order` field, then by createdAt.
 */
export function buildWbsTree(tasks: Task[]): TaskNode[] {
  const byParent = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const key = task.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(task);
  }
  for (const list of byParent.values()) {
    list.sort(
      (a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  function build(parentId: string | null, prefix: string): TaskNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((task, index) => {
      const wbsCode = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      return {
        ...task,
        wbsCode,
        children: build(task.id, wbsCode),
      };
    });
  }

  return build(null, "");
}

/** Flattens a WBS tree back into a depth-first ordered list (for tables etc). */
export function flattenWbsTree(nodes: TaskNode[]): TaskNode[] {
  const out: TaskNode[] = [];
  function walk(list: TaskNode[]) {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  }
  walk(nodes);
  return out;
}
