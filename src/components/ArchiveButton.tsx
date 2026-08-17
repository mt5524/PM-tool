"use client";

import { useTransition } from "react";
import { setProjectArchived } from "@/lib/actions/projects";

export function ArchiveButton({
  projectId,
  archived,
  className,
}: {
  projectId: string;
  archived: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => setProjectArchived(projectId, !archived))}
      className={
        className ??
        "rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50"
      }
    >
      {pending ? "処理中..." : archived ? "アーカイブを解除" : "アーカイブする"}
    </button>
  );
}
