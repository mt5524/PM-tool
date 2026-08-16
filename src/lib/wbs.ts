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

/** Finds a node anywhere in the tree by id (depth-first search). */
export function findWbsNode(nodes: TaskNode[], id: string): TaskNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findWbsNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Reorders the sibling list under `parentId` (moving `activeId` to `overId`'s
 * position) and returns both the updated tree and the resulting sibling id
 * order (for persisting via a server action). Does not touch any other level
 * of the tree — reparenting across levels is not supported by this helper.
 */
export function reorderWbsSiblings(
  nodes: TaskNode[],
  parentId: string | null,
  activeId: string,
  overId: string,
): { tree: TaskNode[]; orderedIds: string[] } {
  let orderedIds: string[] = [];

  function walk(list: TaskNode[], currentParentId: string | null): TaskNode[] {
    if (currentParentId === parentId) {
      const oldIndex = list.findIndex((n) => n.id === activeId);
      const newIndex = list.findIndex((n) => n.id === overId);
      const moved =
        oldIndex === -1 || newIndex === -1 || oldIndex === newIndex
          ? list
          : arrayMove(list, oldIndex, newIndex);
      orderedIds = moved.map((n) => n.id);
      return moved;
    }
    return list.map((n) => ({ ...n, children: walk(n.children, n.id) }));
  }

  const tree = walk(nodes, null);
  return { tree, orderedIds };
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const copy = list.slice();
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
