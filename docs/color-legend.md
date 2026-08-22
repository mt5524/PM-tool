# 色の凡例

アプリ内の色分けバッジの意味を一覧化したもの。アプリ内でも `/legend` ページで同じ内容を確認できる。
色の定義は `src/lib/labels.ts` に集約されている(`taskStatusColors` / `taskStatusBarColors` / `projectStatusColors` / `priorityColors`)。

## プロジェクトのステータス

| ステータス | 色 |
|---|---|
| 計画中 (PLANNING) | 灰色 (stone) |
| 進行中 (ACTIVE) | 緑 (emerald) |
| 保留 (ON_HOLD) | 黄 (amber) |
| 完了 (COMPLETED) | 青緑 (teal) |
| アーカイブ (ARCHIVED) | 濃い灰色 (stone, 薄字) |

## タスクのステータス(カンバン・WBS・ガント共通)

| ステータス | バッジ色 | ガント/WBSバーの色 |
|---|---|---|
| 未着手 (TODO) | 灰色 (stone) | 灰色 (stone) |
| 進行中 (IN_PROGRESS) | 黄 (amber) | 黄 (amber) |
| レビュー (REVIEW) | 紫 (purple) | 紫 (purple) |
| 完了 (DONE) | 緑 (emerald) | 緑 (emerald) |

## 優先度

| 優先度 | 色 |
|---|---|
| 低 (LOW) | 灰色 (stone) |
| 中 (MEDIUM) | 薄い黄 (amber-50) |
| 高 (HIGH) | 橙 (orange) |
| 緊急 (URGENT) | 赤 (red) |

## その他のマーク

- **AI下書き**: 紫色のバッジ(`bg-violet-100 text-violet-700`)。文書からのAIインポートで作成され、まだ人間が編集・確認していないタスク/マイルストーンに表示される。編集して保存すると外れる
- **マイルストーン(◆)**: ガントチャート上で琥珀色(amber)のひし形として表示
- **本日ライン**: ガントチャート・WBSのタイムライン上で赤い縦線として表示
