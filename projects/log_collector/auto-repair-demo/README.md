# auto-repair-demo — Issue #22 自動改修デモ

RoboMart (架空のロボット販売ECサイト) に仕込まれたバグを、監視 → ログ収集 → AI 一次解析 → AI 改修案提示 → 承認 → PR 発行まで一気通貫でデモするための資材集。

## 構成

```
auto-repair-demo/
├── SPEC.md                          全体設計仕様
├── DEMO_FLOW.md                     E2E 時系列シナリオ
├── README.md                        このファイル
├── examples/
│   ├── incident_management_template.xlsx   ヘッダのみの雛形 (A〜L列)
│   └── incident_management.xlsx            実行時に生成 (状態機械の唯一の真実)
├── orchestrator/
│   ├── excel-driver.js              Excel 状態機械の司令塔
│   ├── web-ui.js                    Excel 閲覧+編集WEBコンソール (port 4001)
│   ├── web-ui.html                  Web UI フロント (単一ページ)
│   ├── run-demo.sh                  E2E ワンショット起動
│   ├── demo-config.json             モデル/effort/タイムアウト設定 (親CC非依存)
│   ├── lib/excel-io.js              Excel 書き込みのシリアライザ
│   ├── lib/subagent-invoker.js      claude --agent 子プロセス起動
│   ├── scripts/gen-template.js      雛形 xlsx 生成
│   └── package.json
└── output/                          log_collector が書き出す結果 xlsx
```

関連:
- `../demo-app/` — RoboMart Web アプリ本体 (バグ2種入り) + watchdog
- `../../..*.claude/agents/{incident-analyzer,repair-planner,pr-publisher}.md` — Claude Code サブエージェント定義

## 公開URL

| 用途 | 外部URL | ローカル代替 | ポート |
|------|---------|-------------|:--:|
| RoboMart Web アプリ | http://ec2-54-88-196-71.compute-1.amazonaws.com:3002 | `http://localhost:3002` | 3002 |
| Incident Console (Excel Web UI) | http://ec2-54-88-196-71.compute-1.amazonaws.com:4001 | `http://localhost:4001` | 4001 |

ポート選定は EC2 の SG (`SG-SHIFT-hermes-dev`) が inbound 開放している範囲から未使用ポートを選択。

## モデル/応答速度の設定 (demo-config.json)

サブエージェント (incident-analyzer / repair-planner / pr-publisher) のモデル・推論 effort・タイムアウトは
`orchestrator/demo-config.json` **1ファイルだけ**で調整する。**親の Claude Code セッションの `CLAUDE_EFFORT`
(xhigh 等) からは完全に独立**して動作する (子プロセスの `CLAUDE_EFFORT` を config 値で上書きするため)。

```json
{
  "model": "us.anthropic.claude-sonnet-5",
  "defaultEffort": "low",
  "agents": {
    "incident-analyzer": { "effort": "low",  "timeoutMs": 180000 },
    "repair-planner":     { "effort": "low",  "timeoutMs": 180000 },
    "pr-publisher":       { "effort": "low",  "timeoutMs": 600000 }
  }
}
```

- **effort**: `low` / `medium` / `high` / `xhigh` / `max`。デモは応答速度優先で **`low` 推奨**
  (incident-analyzer が xhigh 約60秒 → low 約19秒に短縮。解析/改修案/PR発行は重い推論を要さないため品質は十分)
- **timeoutMs**: そのエージェントが超過したら中断する上限。pr-publisher は git/gh 手順が多いので長め (600秒)
- **model**: エージェント個別に `agents.<name>.model` で上書き可能。無ければ最上位 `model` を使用

変更は次回のエージェント起動から即反映される (web-ui の再起動不要)。

## クイックスタート

```bash
# 前提: demo-app の npm install 済み、orchestrator の npm install 済み

cd projects/log_collector/auto-repair-demo/orchestrator

# 1. RoboMart 起動 + バグ発火 + Web UI + 状態機械開始 (一発)
./run-demo.sh

# 2. ブラウザで http://ec2-54-88-196-71.compute-1.amazonaws.com:4001 を開く
#    (内部なら http://localhost:4001 でも同じ)
#    → Excel の中身がテーブル表示され、3秒毎に自動更新される

# 3. 各段は手動ゲート。Web UI のボタンで段階的に進める:
#    情報収集中 ─[▶ログ収集]→ インシデント検出 ★停止
#             ─[▶調査＆改修案]→ 解析済み → 要承認 ★停止
#    承認者記入+PR作成待ち → 対応完了 (PR自動発行)
```

**Office不要**。ブラウザさえあれば Excel の閲覧・編集ができる。

## 手動ゲート (3段)

同一事象が TrackID 単位で複数起票され得るため、重い AI 処理 (調査/改修/PR) の前に
人が取捨選択できるよう **各段を手動ゲート**にしている。自動では進まない。

### ゲート① インシデント検出 (ログ収集後)

`情報収集中` の行で **▶ ログ収集** ボタン → log_collector が該当ログを収集し `インシデント検出` で停止。
ここまでは軽い grep のみで、AI 解析は走らない。不要なインシデントはこの時点でステータスを
`対応完了` に手動変更して捨ててよい。

### ゲート② 要承認 (調査+改修案作成後)

`インシデント検出` の行で **▶ 調査＆改修案** ボタン → incident-analyzer (一次解析) と
repair-planner (改修案) を続けて実行し `要承認` で停止 (数分)。

### ゲート③ PR発行 (承認後)

`要承認` で改修案 (I 列) を確認したら:
1. **承認者** カラム (J列) に自分の名前を入れる (Enter または blur で即保存)
2. **ステータス** カラム (E列) のドロップダウンで **`PR作成待ち`** を選ぶ (即保存)

ステータス変更を検知して `pr-publisher` が自動起動:
- `fix/inc<番号>-<TrackID>` ブランチを切る (`origin/logcollecter-ai` から)
- 改修案の diff を実コードに適用 → コミット → push → `gh pr create`
- K 列に PR URL を書き戻し → E 列を `対応完了` に更新

## 状態機械

| ステータス | 種別 | 起動対象 (ボタン) | 次のステータス |
|-----------|------|------------------|---------------|
| 情報収集中 | 自動可 | 既存 `log-collector-skill` (▶ログ収集) | インシデント検出 |
| **インシデント検出** | **★手動ゲート** | `claude --agent incident-analyzer` (▶調査＆改修案) | 解析済み |
| 解析済み | 自動可 | `claude --agent repair-planner` | 要承認 |
| **要承認** | **★手動ゲート** | — (承認者記入+PR作成待ちで発火) | — |
| PR作成待ち | 自動可 | `claude --agent pr-publisher` | 対応完了 |
| **対応完了** | **★終端** | — | — |

`▶ 調査＆改修案` は「インシデント検出 → 解析済み → 要承認」を一気に実行 (次の手動ゲート要承認で停止)。

## Web UI 単体起動 (状態機械なしで Excel を眺めるだけ)

```bash
cd projects/log_collector/auto-repair-demo/orchestrator
node web-ui.js
# 外部URL: http://ec2-54-88-196-71.compute-1.amazonaws.com:4001
# 内部URL: http://localhost:4001
# ポート変更: WEB_UI_PORT=4002 node web-ui.js
```

### Web UI の機能

- 全インシデント行をカラーコード付きテーブル表示 (ステータスごとに色分け)
- 3秒毎の自動再読込 (チェックOFFで停止可)
- インライン編集: **ステータス / 担当者 / 承認者 / 調査状況** の4列は Web 上で編集可能。change イベントで即 Excel に書き戻す
- PR URL 列はクリック可能なリンクとして表示
- API:
  - `GET /api/rows` — 全行を JSON で取得
  - `POST /api/rows/:rowNum` — 編集可能列を更新 (`{status, approver, assignee, note}`)

### 編集不可の列 (安全設計)

以下の列は Web UI からは編集できない (書き込み専用のエージェント/watchdog の担当):

- ID, タイムスタンプ, 概要, 収集ログサマリ, 一次解析結果, 改修案, PR URL, 最終更新

## dry-run

PR を実際に発行せず、状態遷移だけ確認したいとき:

```bash
./run-demo.sh --dry-run
```

`log_collector`, 3 サブエージェント全てがスキップされ、各段でスタブ文字列を Excel に書き込むだけになる。

## 単発 tick 実行

デバッグ用に 1 回だけ状態機械を回して止める:

```bash
node excel-driver.js --dry-run --once
```

## 詳細

- 全体設計・状態遷移・エージェント責務 → `SPEC.md`
- E2E 時系列 (どの列がいつ書かれるか) → `DEMO_FLOW.md`
- 実装計画・決定事項 → Issue #22 コメント
