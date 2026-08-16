"use client";

import { useTransition } from "react";

export function DeleteButton({
  action,
  confirmText,
  label = "削除",
  className,
}: {
  action: () => Promise<void>;
  /** Optional. Most deletes here are one-click; pass this only for
   *  high-impact, irreversible deletes (e.g. deleting an entire project). */
  confirmText?: string;
  label?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        startTransition(async () => {
          await action();
        });
      }}
      className={className ?? "text-sm text-red-600 hover:underline disabled:opacity-50"}
    >
      {pending ? "削除中..." : label}
    </button>
  );
}
