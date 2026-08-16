"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { importTasksFromText, importMilestonesFromText } from "@/lib/actions/import";

export function ImportDialog({
  projectId,
  mode,
  trigger,
}: {
  projectId: string;
  mode: "tasks" | "milestones";
  trigger: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const label = mode === "tasks" ? "タスク" : "マイルストーン";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        if (mode === "tasks") {
          const { count } = await importTasksFromText(projectId, text);
          setResult(`${count}件のタスクを下書きとして追加しました。`);
        } else {
          const { count, skipped } = await importMilestonesFromText(projectId, text);
          setResult(
            `${count}件のマイルストーンを下書きとして追加しました。` +
              (skipped ? `(日付が不明で${skipped}件をスキップ)` : ""),
          );
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  }

  function handleClose() {
    dialogRef.current?.close();
    setText("");
    setError(null);
    setResult(null);
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="contents">
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className="w-[min(36rem,92vw)] rounded-lg p-0 backdrop:bg-black/40"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">文書から{label}をインポート</h2>
            <button type="button" onClick={handleClose} className="text-neutral-400 hover:text-neutral-600">
              ✕
            </button>
          </div>

          <p className="text-xs text-neutral-500">
            テキスト/Markdown文書を貼り付けるか、ファイルを選択してください。AIが内容を解析し、
            {label}の下書きとして追加します(内容は後から確認・編集できます)。
          </p>

          <label className="text-sm">
            ファイルから読み込む(.txt / .md)
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleFileChange}
              className="mt-1 w-full text-sm"
            />
          </label>

          <label className="text-sm">
            文書テキスト
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={10}
              placeholder="ここに文書を貼り付けてください..."
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && <p className="text-sm text-emerald-600">{result}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              閉じる
            </button>
            <button
              type="submit"
              disabled={pending || !text.trim()}
              className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {pending ? "AIが解析中..." : "変換して追加"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
