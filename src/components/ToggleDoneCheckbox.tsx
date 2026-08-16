"use client";

import { useTransition } from "react";
import { toggleMilestoneDone } from "@/lib/actions/milestones";

export function ToggleDoneCheckbox({
  milestoneId,
  projectId,
  done,
}: {
  milestoneId: string;
  projectId: string;
  done: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={done}
      disabled={pending}
      onChange={(e) => {
        const checked = e.target.checked;
        startTransition(async () => {
          await toggleMilestoneDone(milestoneId, projectId, checked);
        });
      }}
      className="h-4 w-4 rounded border-stone-300"
    />
  );
}
