import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Priority } from "@prisma/client";

// Flat lists (with tempId/parentTempId) instead of nested trees — Anthropic's
// structured-output JSON Schema support does not allow recursive schemas, and
// a flat list also maps directly onto Task's self-referencing parentId column.
const ExtractedTaskSchema = z.object({
  tempId: z.string().describe("この文書内で一意な仮ID(例: t1, t2)"),
  parentTempId: z
    .string()
    .nullable()
    .describe("親タスクのtempId。トップレベルのタスクならnull"),
  title: z.string().describe("タスク名"),
  description: z.string().nullable().describe("補足説明。なければnull"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).describe("優先度の推定値"),
});

const TaskExtractionSchema = z.object({
  tasks: z.array(ExtractedTaskSchema),
});

const ExtractedMilestoneSchema = z.object({
  name: z.string().describe("マイルストーン名"),
  date: z.string().describe("YYYY-MM-DD形式の日付。文書に明記がなければ最も妥当な推定日"),
  description: z.string().nullable(),
});

const MilestoneExtractionSchema = z.object({
  milestones: z.array(ExtractedMilestoneSchema),
});

export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;
export type ExtractedMilestone = z.infer<typeof ExtractedMilestoneSchema>;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEYが設定されていません。.envに追加してください。",
    );
  }
  return new Anthropic();
}

/** 自由記述のテキスト文書からWBSタスク一覧を抽出する(フラット構造、tempIdで親子関係を表現)。 */
export async function extractTasksFromDocument(docText: string): Promise<ExtractedTask[]> {
  const client = getClient();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system:
      "あなたはプロジェクト文書からWBS(作業分解構成図)のタスクを抽出する専門家です。" +
      "文書に書かれた作業項目を、適切な粒度で親子関係を持つタスクとして抽出してください。" +
      "各タスクには一意な仮ID(tempId)を振り、親タスクがあればそのtempIdをparentTempIdに設定してください。" +
      "深すぎる階層(4階層超)は避け、実務的な粒度に留めてください。",
    messages: [
      { role: "user", content: `以下の文書からWBSタスクを抽出してください:\n\n${docText}` },
    ],
    output_config: { format: zodOutputFormat(TaskExtractionSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AIが処理を拒否しました。文書の内容を確認してください。");
  }
  return response.parsed_output?.tasks ?? [];
}

/** 自由記述のテキスト文書からマイルストーン一覧を抽出する。 */
export async function extractMilestonesFromDocument(
  docText: string,
): Promise<ExtractedMilestone[]> {
  const client = getClient();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system:
      "あなたはプロジェクト文書からマイルストーン(節目となる日付・イベント)を抽出する専門家です。" +
      "日付が明記されていないマイルストーンについては、文脈から最も妥当な日付を推定してください。" +
      "推定が困難な場合は、他の確定した日付から合理的に近い日付を設定してください。",
    messages: [
      { role: "user", content: `以下の文書からマイルストーンを抽出してください:\n\n${docText}` },
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
