import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Priority } from "@prisma/client";

// Flat lists (with tempId/parentRef) instead of nested trees — Anthropic's
// structured-output JSON Schema support does not allow recursive schemas, and
// a flat list also maps directly onto Task's self-referencing parentId column.
const ExtractedTaskSchema = z.object({
  tempId: z.string().describe("この文書内で一意な仮ID(例: t1, t2)"),
  existingTaskId: z
    .string()
    .nullable()
    .describe(
      "この項目が下記の既存タスク一覧のいずれかを指している(=更新)場合、そのタスクのID。新規タスクの場合はnull。",
    ),
  parentRef: z
    .string()
    .nullable()
    .describe(
      "親タスクの参照。この文書内の他タスクのtempId、または既存タスク一覧のID、のいずれか。トップレベルならnull。" +
        "既存タスクを更新する際に親を変更しない場合は、そのタスクの現在の親IDをそのまま設定すること。",
    ),
  title: z.string().describe("タスク名(既存タスクの更新で名前を変えない場合は現在の名前をそのまま)"),
  description: z.string().nullable().describe("補足説明。既存タスクの説明を変えない場合は現在の値をそのまま"),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .describe("優先度。既存タスクの優先度を変えない場合は現在の値をそのまま"),
});

const TaskExtractionSchema = z.object({
  tasks: z.array(ExtractedTaskSchema),
});

const ExtractedMilestoneSchema = z.object({
  tempId: z.string().describe("この文書内で一意な仮ID"),
  existingMilestoneId: z
    .string()
    .nullable()
    .describe("下記の既存マイルストーン一覧のいずれかを指している(=更新)場合、そのID。新規なら null。"),
  name: z.string().describe("マイルストーン名(既存の更新で名前を変えない場合は現在の名前をそのまま)"),
  date: z.string().describe("YYYY-MM-DD形式の日付。明記がなければ最も妥当な推定日"),
  description: z.string().nullable(),
});

const MilestoneExtractionSchema = z.object({
  milestones: z.array(ExtractedMilestoneSchema),
});

export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;
export type ExtractedMilestone = z.infer<typeof ExtractedMilestoneSchema>;

export type ExistingTaskContext = {
  id: string;
  title: string;
  parentId: string | null;
  description: string | null;
  priority: Priority;
};

export type ExistingMilestoneContext = {
  id: string;
  name: string;
  date: Date;
  description: string | null;
};

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEYが設定されていません。.envに追加してください。",
    );
  }
  return new Anthropic();
}

/**
 * 自由記述のテキスト文書からWBSタスクの新規追加・既存タスクの更新を抽出する。
 * `existingTasks` を渡すことで、文書中の記述が既存タスクを指しているかどうかを
 * AIに判断させ、該当する場合は existingTaskId を設定させる(=更新扱い)。
 */
export async function extractTasksFromDocument(
  docText: string,
  existingTasks: ExistingTaskContext[],
): Promise<ExtractedTask[]> {
  const client = getClient();
  const titleById = new Map(existingTasks.map((t) => [t.id, t.title]));
  const existingListText = existingTasks.length
    ? existingTasks
        .map((t) => {
          const parentTitle = t.parentId ? (titleById.get(t.parentId) ?? "不明") : null;
          return `- id=${t.id} title="${t.title}" priority=${t.priority} parentId=${t.parentId ?? "null"}${
            parentTitle ? ` (親: ${parentTitle})` : ""
          }${t.description ? ` description="${t.description}"` : ""}`;
        })
        .join("\n")
    : "(既存タスクはありません)";

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system:
      "あなたはプロジェクト文書からWBS(作業分解構成図)のタスクを抽出・更新する専門家です。\n" +
      "文書には新規タスクの追加だけでなく、既存タスクの変更(タイトル変更、優先度変更、説明の追記、進捗の反映など)が含まれる場合があります。\n" +
      "文書中の記述が下記の既存タスクのいずれかを指している場合は、existingTaskIdにそのIDを設定してください(=更新)。" +
      "新規タスクの場合はexistingTaskIdをnullにしてください。\n\n" +
      `## 既存タスク一覧\n${existingListText}\n\n` +
      "各タスクには一意な仮ID(tempId)を振ってください(既存タスクの更新の場合も便宜上必要です)。" +
      "親子関係はparentRefで表現し、この文書内の他タスクのtempId、または既存タスク一覧のID、のいずれかを指定できます。" +
      "既存タスクを更新する際、文書内で親の変更が明示されていなければ、そのタスクの現在のparentIdをそのままparentRefに設定してください(nullにしないこと)。" +
      "同様に、文書内で変更が明示されていないフィールド(説明・優先度など)は、既存タスクの現在の値をそのまま引き継いでください。" +
      "深すぎる階層(4階層超)は避け、実務的な粒度に留めてください。",
    messages: [
      { role: "user", content: `以下の文書を解析してください:\n\n${docText}` },
    ],
    output_config: { format: zodOutputFormat(TaskExtractionSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AIが処理を拒否しました。文書の内容を確認してください。");
  }
  return response.parsed_output?.tasks ?? [];
}

/**
 * 自由記述のテキスト文書からマイルストーンの新規追加・既存マイルストーンの更新を抽出する。
 */
export async function extractMilestonesFromDocument(
  docText: string,
  existingMilestones: ExistingMilestoneContext[],
): Promise<ExtractedMilestone[]> {
  const client = getClient();
  const existingListText = existingMilestones.length
    ? existingMilestones
        .map(
          (m) =>
            `- id=${m.id} name="${m.name}" date=${m.date.toISOString().slice(0, 10)}${
              m.description ? ` description="${m.description}"` : ""
            }`,
        )
        .join("\n")
    : "(既存マイルストーンはありません)";

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system:
      "あなたはプロジェクト文書からマイルストーン(節目となる日付・イベント)を抽出・更新する専門家です。\n" +
      "文書中の記述が下記の既存マイルストーンのいずれかを指している(日付変更など)場合は、existingMilestoneIdにそのIDを設定してください(=更新)。" +
      "新規の場合はnullにしてください。\n\n" +
      `## 既存マイルストーン一覧\n${existingListText}\n\n` +
      "日付が明記されていない新規マイルストーンについては、文脈から最も妥当な日付を推定してください。" +
      "既存マイルストーンを更新する際、文書内で変更が明示されていないフィールドは現在の値をそのまま引き継いでください。",
    messages: [
      { role: "user", content: `以下の文書を解析してください:\n\n${docText}` },
    ],
    output_config: { format: zodOutputFormat(MilestoneExtractionSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AIが処理を拒否しました。文書の内容を確認してください。");
  }
  return response.parsed_output?.milestones ?? [];
}

export function toPriorityEnum(value: string): Priority {
  return (Object.values(Priority) as string[]).includes(value)
    ? (value as Priority)
    : Priority.MEDIUM;
}
