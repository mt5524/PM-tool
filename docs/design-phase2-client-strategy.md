# Phase 2 設計: 顧客・戦略連携 + リスク/営業 + Notion連携

作成日: 2026-08-15
ステータス: ドラフト(レビュー待ち、未実装)

## 背景

現状のpm-toolは「プロジェクト単位のタスク管理」(カンバン/WBS/ガント/マイルストーン)まで実装済み。
ここに以下を追加し、「顧客ごとの戦略・リスク・営業活動を横断的に扱うプラットフォーム」に拡張する。

- 顧客の中期経営計画・環境変化とプロジェクトの紐づけ
- 環境分析(PEST/SWOT等)の定期実施と履歴管理
- プロジェクトごとのリスク管理
- 提案書ドラフト作成支援
- 商談記録の紐づけ
- 新規事業案のブレインストーミング支援
- Notion連携
- UIリニューアル

実装ボリュームが大きいため、3フェーズに分割する。**このドキュメントは①を中心に詳細設計し、②③は概略のみ示す。**

---

## フェーズ①: 顧客・戦略連携(最優先)

### 目的
「このプロジェクトは、どの顧客の、どんな経営課題に対応するものか」を常に参照できるようにする。

### データモデル

```prisma
model Client {
  id          String   @id @default(cuid())
  name        String
  industry    String?          // 業種
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  projects            Project[]
  midTermPlans        MidTermPlan[]
  environmentAnalyses EnvironmentAnalysis[]
}

// Project に clientId を追加(既存モデルへの変更)
model Project {
  // ...既存フィールド...
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
}

model MidTermPlan {
  id          String    @id @default(cuid())
  clientId    String
  client      Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  title       String            // 例: 「2026-2028年度 中期経営計画」
  periodStart DateTime?
  periodEnd   DateTime?
  summary     String?           // 中計の要旨(自由記述)
  keyThemes   String?           // 重点テーマ(自由記述 or 将来的にJSON配列化)
  sourceUrl   String?           // 原本資料へのリンク(Notion/Box/PDF等)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([clientId])
}

enum EnvAnalysisFramework {
  PEST   // 政治・経済・社会・技術
  SWOT   // 強み・弱み・機会・脅威
  THREE_C // Company/Customer/Competitor
  OTHER
}

model EnvironmentAnalysis {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  projectId   String?          // 特定プロジェクト向けの分析なら紐づけ(任意)
  project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  framework    EnvAnalysisFramework
  content      Json             // フレームワークごとの項目を柔軟に保持
                                 // 例(SWOT): { strengths: [...], weaknesses: [...], opportunities: [...], threats: [...] }
  summary      String?          // 分析からの示唆・結論
  analyzedAt   DateTime @default(now())
  nextReviewAt DateTime?        // 次回レビュー予定日(通知に利用)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clientId])
  @@index([projectId])
}
```

**設計判断メモ:**
- `EnvironmentAnalysis.content` を `Json` 型にしたのは、PEST/SWOT/3Cでフィールド構成が異なるため。フレームワークごとに厳密な型を作ると管理が煩雑になるので、UI側でフレームワークに応じたフォームを出し分ける方針。
- `Project.clientId` は `onDelete: SetNull` にして、顧客を削除してもプロジェクト自体は残るようにする(逆に `Client` 削除時に `MidTermPlan`/`EnvironmentAnalysis` は `Cascade` で消す)。

### 画面構成

| パス | 内容 |
|---|---|
| `/clients` | 顧客一覧(新規作成ボタンあり) |
| `/clients/[id]` | 顧客詳細。タブ: 概要 / 中期経営計画 / 環境分析 / 紐づくプロジェクト一覧 |
| `/clients/[id]/mid-term-plans` | 中期経営計画の一覧・追加・編集 |
| `/clients/[id]/environment` | 環境分析の履歴一覧(フレームワーク別フィルタ)・新規分析追加 |
| `/projects/[id]` (既存) | ヘッダーに顧客名を表示するバッジを追加、クリックで顧客詳細へ |
| `/projects/[id]/environment` (新規タブ) | このプロジェクトに関連する環境分析を表示(顧客全体の分析から絞り込み) |

### 定期レビューの通知(将来拡張)
`EnvironmentAnalysis.nextReviewAt` を使い、期限が近づいたら通知する仕組み。実装候補:
- Vercel Cron(`vercel.json`にcron設定)で毎日バッチ実行し、期限が近いレコードをメール/Slack通知
- もしくは当面は `/clients/[id]/environment` 画面で「レビュー期限超過」を赤バッジ表示するだけに留め、通知は後回しでもよい

→ **初期実装ではUI表示のみとし、外部通知は別チケットにする**(スコープを絞る)

---

## フェーズ②: リスク・提案・営業(概略)

### RiskItem(リスク管理)
```prisma
enum RiskLevel  { LOW MEDIUM HIGH }
enum RiskStatus { OPEN MITIGATING CLOSED }

model RiskItem {
  id              String     @id @default(cuid())
  projectId       String
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  title           String
  description     String?
  probability     RiskLevel
  impact          RiskLevel
  status          RiskStatus @default(OPEN)
  contingencyPlan String?    // コンティンジェンシープラン
  owner           String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
}
```
- リスクスコアは `probability × impact` をUI側で計算して色分け表示(DBには保存しない)
- `/projects/[id]/risks` タブを追加

### Proposal(提案書)・SalesRecord(商談記録)・BusinessIdea(新規事業案)
```prisma
enum ProposalStatus { DRAFT REVIEW SENT WON LOST }

model Proposal {
  id        String         @id @default(cuid())
  projectId String
  project   Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title     String
  status    ProposalStatus @default(DRAFT)
  content   String?        // Markdown下書き
  sentAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SalesRecord {
  id          String    @id @default(cuid())
  projectId   String?
  clientId    String?
  meetingDate DateTime
  attendees   String?
  summary     String?
  nextAction  String?
  createdAt   DateTime @default(now())
}

enum IdeaStatus { IDEA EVALUATING PROPOSED REJECTED ADOPTED }

model BusinessIdea {
  id          String     @id @default(cuid())
  clientId    String?
  title       String
  description String?
  status      IdeaStatus @default(IDEA)
  score       Int?       // 簡易評価スコア(1-10等)
  createdAt   DateTime @default(now())
}
```
- 提案書は「Markdown下書きをアプリ内で作成 → 手動でWord/PowerPoint化(既存のdocx/pptxスキルを利用)」という運用を想定。アプリ内でのLLM呼び出し(自動生成ボタン)はこのフェーズではスコープ外とし、チャット上でClaudeに下書きを書いてもらってコピペする運用から始める

---

## フェーズ③: Notion連携・UIリニューアル(概略)

### Notion連携方式(要相談)

| 案 | 内容 | 向いているケース |
|---|---|---|
| A. Notion→pm-tool 同期 | Notion DBをマスタとし、定期的にpm-toolへ取り込む | 既にNotionでプロジェクト管理している場合の移行期 |
| B. pm-tool→Notion 書き出し | 議事録・提案書などをNotionページとして自動生成 | 社内共有・検索性を重視する場合 |
| C. 双方向同期 | 上記両方 | 複雑。競合解消ロジックが必要で初期は非推奨 |

**推奨: まずB(pm-tool→Notion書き出し)から。** 商談記録や提案書ドラフトが出来上がった時点で「Notionに書き出す」ボタンを押すと、Notion API経由で該当ページが作成される、というシンプルな一方向連携。

### UIリニューアル
- 現状はTailwindの素のUI。エンティティが増える(顧客/リスク/環境分析/提案書/商談/事業案)ため、左サイドバー型のナビゲーションに変更を検討
- デザインシステム導入(shadcn/ui等)も選択肢

---

## 実装順序の提案

1. **① 顧客・戦略連携**(Client / MidTermPlan / EnvironmentAnalysis + 画面)
2. **② リスク管理**(RiskItemのみ先行、Proposal/SalesRecord/BusinessIdeaは後回し可)
3. **② 提案書・商談記録・新規事業案**
4. **③ UIリニューアル**(サイドバー化)
5. **③ Notion連携**(B方式から)

各ステップごとに動作確認しながら段階的にマージしていく。
