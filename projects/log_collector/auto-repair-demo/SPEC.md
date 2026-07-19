# Issue #22 — LogCollector × AI 自動改修デモ 仕様書 (SPEC.md)

**対象Issue**: [shiftrepo/ai_workshop#22](https://github.com/shiftrepo/ai_workshop/issues/22)
**プロジェクトパス**: `projects/log_collector/`
**位置づけ**: 既存 `log_collector` を土台に、Webアプリの障害検出 → AIによる一次解析 → 改修案提示 → PR発行 までを一気通貫でデモする。

---

## 1. デモのゴール

「Webアプリに仕込んだバグが本番稼働で顕在化 → ログを自動収集 → Excelで一次解析 → AIが改修案を提示 → 承認後PR発行」までを **1コマンドで再現できる状態** にする。

### 何を見せるか

| # | シーン | 見せどころ |
|---|--------|-----------|
| 1 | Webアプリの通常動作 | ログが出ていて監視できていることが分かる |
| 2 | バグ発火 | 特定操作でエラーが出る (TrackID付き) |
| 3 | 障害検知 → Excel記載 | 監視→インシデント起票が自動化されている |
| 4 | log_collector 実行 | 既存Skill で該当ログが引ける |
| 5 | AI一次解析 | Excelの調査状況列に原因/影響範囲が書き戻される |
| 6 | AI改修案提示 | 差分候補+テスト計画がExcelに記載される |
| 7 | 人が承認 | Excel の「ステータス」列を "PR作成待ち" に変更 |
| 8 | PR発行 | ブランチ切って `gh pr create` |

---

## 2. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│ projects/log_collector/                                         │
│                                                                 │
│  demo-app/          ← Step1-2: 簡易Webアプリ + バグ仕込み       │
│  ├─ server.js         Node.js + Express                          │
│  ├─ views/            静的HTML                                    │
│  ├─ logs/             ログ出力先 (SSH越しに読む)                  │
│  └─ bug-config.json   バグ仕込みトグル                            │
│                                                                 │
│  auto-repair-demo/  ← Step3-5: 自動化本体 (New)                 │
│  ├─ SPEC.md           このファイル                                │
│  ├─ DEMO_FLOW.md      E2Eシナリオ                                 │
│  ├─ agents/           Claude Code サブエージェント定義群          │
│  │   ├─ incident-analyzer.md   一次解析エージェント               │
│  │   ├─ repair-planner.md      改修案提示エージェント             │
│  │   └─ pr-publisher.md        PR発行エージェント                 │
│  ├─ orchestrator/     Excelを起点にエージェントを起動する制御層   │
│  │   ├─ excel-driver.js        Excel読み書き + 状態機械           │
│  │   └─ run-demo.sh            E2E一発起動                        │
│  └─ examples/                                                   │
│      └─ incident_management.xlsx  デモ用インシデント台帳          │
│                                                                 │
│  client/            ← 既存: SSH経由ログ収集                     │
│  dev-environment/   ← 既存: 3サーバ Docker                     │
│  log-collector-skill/  ← 既存: Skill/Agent 資材                │
└─────────────────────────────────────────────────────────────────┘
```

### データフロー (Excel駆動パイプライン)

```
   ┌──────────────┐   人がバグ発火    ┌──────────────────┐
   │  demo-app    │──────────────────>│ demo-app/logs/*  │
   │  (Express)   │   TrackID付き      └──────────────────┘
   └──────────────┘                              │
                                                 │ SSH grep
                                                 v
                                        ┌──────────────────┐
                                        │ log_collector    │
                                        │ (既存Skill)      │
                                        └──────────────────┘
                                                 │
                                                 v
   ┌──────────────────────────────────────────────────────────────┐
   │  incident_management.xlsx                                    │
   │  ┌────┬──────┬─────────┬─────────┬─────┬──────────────┬──────┐│
   │  │ID  │Track │Time     │概要     │担当 │ステータス      │調査 ││
   │  │INC1│A     │...      │TrackID:A│AI   │インシデント検出 │     ││ ←起点(起票時)
   │  └────┴──────┴─────────┴─────────┴─────┴──────────────┴──────┘│
   └──────────────────────────────────────────────────────────────┘
                     │ 人が「▶調査＆改修案」ボタンを押す
                     v
     ┌──────────────────┬──────────────────┬──────────────────┐
     │ ステータス       │ 起動エージェント │ 書き戻し先        │
     ├──────────────────┼──────────────────┼──────────────────┤
     │ インシデント検出 │ log_collector    │ 調査状況(ログ添付)│ ★起票=手動ゲート
     │ ログ収集済み     │ incident-analyzer│ 一次解析結果      │
     │ 解析済み         │ repair-planner   │ 改修案+テスト計画 │
     │ 要承認           │ (手動ゲート②)    │ ―                 │
     │ PR作成待ち       │ pr-publisher     │ PR URL            │
     │ 対応完了         │ (終端)           │ ―                 │
     └──────────────────┴──────────────────┴──────────────────┘
```

**キーポイント**:
- Excel の "ステータス列" が唯一のトリガー。人がステータスを進めれば次のエージェントが動く。
- 各エージェントは自分の担当ステータスの行だけ処理し、完了したらステータスを次段に進める。
- 監視は `excel-driver.js` が1〜数秒間隔で Excel を読む単純ポーリング。

---

## 3. Excel状態遷移仕様

### 3.1 既存列

| 列 | ヘッダー | 内容 |
|----|----------|------|
| A | インシデントID | INC001 など |
| B | TrackID | app.log/service.logを串刺しで結ぶ一意ID (watchdogがログから抽出して記入) |
| C | タイムスタンプ | インシデント発生時刻 |
| D | インシデント概要 | TrackID等を含む説明文 |
| E | 担当者 | 担当者名 |
| F | ステータス | **状態機械の遷移トリガー** |
| G | 調査状況 | 調査メモ (log_collectorが追記) |

### 3.2 新規追加列

| 列 | ヘッダー | 記入者 | 内容 |
|----|----------|--------|------|
| H | 収集ログサマリ | log_collector | 収集件数 + 出力Excelファイル名 |
| I | 一次解析結果 | incident-analyzer | 症状/原因/影響範囲/再現手順 (JSON+人可読) |
| J | 改修案 | repair-planner | 対象ファイル/変更方針/テスト計画 |
| K | 承認者 | 人 | 改修案を承認した担当者名 |
| L | PR URL | pr-publisher | 発行されたPRのURL |
| M | 最終更新 | 各エージェント | ISO 8601タイムスタンプ |

### 3.3 ステータス列(F)の状態機械

```
    [新規]                       ← 監視ツール(watchdog)がバグ発火を検知
      │
      v ステータス="インシデント検出"  ★手動ゲート① — 起票時点で確認待ち
      │
      │ (人が「▶ 調査＆改修案」ボタンを押す)
      v
    [log_collector]              ← 既存Skill が SSH で該当ログ(TrackID一致)を引く
      │
      v ステータス="ログ収集済み"  ← 自動で次へ
    [incident-analyzer]          ← 一次解析エージェント (New)
      │
      v ステータス="解析済み"      ← 自動で次へ
    [repair-planner]             ← 改修案エージェント (New)
      │
      v ステータス="要承認"        ★手動ゲート② — 人が確認するために停止
      │
      │ (人が承認者を記入し ステータス="PR作成待ち" に編集)
      v
    [pr-publisher]               ← PR発行エージェント (New)
      │
      v ステータス="対応完了"      ★終端
```

**設計原則**:
1. **一方向遷移** — 逆戻りは人手のみ。エージェントは前進のみ。
2. **起票=確認待ち** — watchdog はバグ発火を検知した時点で `インシデント検出` として起票する。
   これ自体が手動ゲート① を兼ねる (「情報収集中」ステータスは廃止)。
3. **手動ゲートは2つ** —
   - `インシデント検出` (ゲート①): 起票直後。人が「▶調査＆改修案」を押すまで重い処理 (ログ収集/解析/改修) は走らない。
     同一事象が TrackID 単位で複数起票されるため、人が取捨選択してから進める。
   - `要承認` (ゲート②): 改修案の確認後にのみ PR を発行 (Issue #22 の「改修案の確認後改修して、PRを発行する」に対応)。
3. **エージェントは冪等** — 同じ行が2回流れても M列(最終更新)で重複判定。
4. **`▶ 調査＆改修案` ボタン** は「インシデント検出 → 解析済み → 要承認」を一気に実行し、次の手動ゲート `要承認` で停止する (analyzer と planner の間には手動ゲートを置かない)。

---

## 4. サブエージェント階層

### 4.1 3本のClaude Codeサブエージェント (すべて `agent-registration/` と同形式で登録)

#### A. `incident-analyzer` — 一次解析エージェント
- **発火**: `インシデント検出` 行で人が「▶ 調査＆改修案」ボタンを押したとき (手動ゲート①)
- **入力**: Excel の "インシデント検出" 行 + H列の収集ログサマリで示された生ログ.xlsx
- **やること**:
  1. ログを読み、症状 (Symptom) と最も可能性の高い原因 (RootCauseHypothesis) を1〜3件挙げる
  2. 影響範囲 (どのエンドポイント/機能が壊れているか) を特定
  3. 再現手順 (curl等) を書き出す
- **出力**: Excel I列 に構造化テキスト + ステータスを "解析済み" に更新
- **モデル/effort**: `demo-config.json` で設定 (既定 Sonnet 5 / effort=low)

#### B. `repair-planner` — 改修案提示エージェント
- **入力**: Excel の "解析済み" 行 + I列の解析結果 + 対象コード (demo-app/)
- **やること**:
  1. 修正すべきファイル/行を特定
  2. 変更方針を diff もどきで提示 (`--- a/... +++ b/...`)
  3. 追加すべきテスト (unit / e2e) を列挙
  4. ロールバック手順
- **出力**: Excel J列 + ステータスを "要承認" に更新
- **注意**: **この段階ではコードを書き換えない**。あくまで案。

#### C. `pr-publisher` — PR発行エージェント
- **発火条件**: 人がステータス列を **"PR作成待ち"** に手動で変更した行
- **やること**:
  1. `fix/inc-<ID>` ブランチを切る
  2. J列の改修案に従ってコードを実際に編集
  3. テスト実行 (`npm test` があれば)
  4. コミット + push + `gh pr create`
  5. PR本文に I列(解析), J列(改修案), K列(承認者) を貼る
- **出力**: Excel L列にPR URL + ステータスを "対応完了" に更新
- **安全策**:
  - 必ず `main` からブランチ切り
  - `--no-verify` は使わない
  - テスト失敗時はPRを Draft で出し、Excelにも "テスト失敗" と書き戻す

### 4.2 orchestrator — 状態機械の司令塔

`auto-repair-demo/orchestrator/excel-driver.js` に集約:

```javascript
// 実装: orchestrator/lib/driver-core.js
const HANDLERS = {
  'インシデント検出': { fn: runLogCollector,     next: 'ログ収集済み' },
  'ログ収集済み':     { fn: runIncidentAnalyzer, next: '解析済み' },
  '解析済み':         { fn: runRepairPlanner,    next: '要承認' },
  'PR作成待ち':       { fn: runPrPublisher,      next: '対応完了' },
};
// 手動ゲート: この状態に到達したら advanceRowToGate は停止する
const STOP_STATES = new Set(['要承認', '対応完了']);

while (true) {
  const rows = readExcel(INCIDENT_XLSX);
  for (const row of rows) {
    const handler = STATE_HANDLERS[row.status];
    if (!handler) continue;                // 対象外ステータス
    if (recentlyProcessed(row)) continue;  // M列で冪等性担保
    invokeSubagent(handler.agent, row);    // Claude Code サブエージェント呼出
    writeStatus(row.id, handler.nextStatus);
  }
  sleep(3000);
}
```

**サブエージェント起動方法** (2択):
1. **Claude Code CLI越し**: `claude --agent incident-analyzer --input row.json` (推奨)
2. **Node子プロセス**: Anthropic APIを直接叩く独立モジュールにフォールバック

デモではまず 1 の想定で作り、依存が重ければ 2 で置き換える。

---

## 5. Step1-2: Webアプリ + バグ仕込み

### 5.1 Webアプリ (`demo-app/`) — 架空のロボット販売ECサイト "RoboMart"

**目的**: 「商品を見て、カートに入れて、注文する」というEC定番フローで、障害が起きる場所とユーザーインパクトが直感的に分かるサイトにする。

- **題材**: ロボット販売ECサイト "RoboMart"
- **技術**: Node.js + Express + 素のHTML/CSS/fetch (SPA不要、ページ遷移で十分)
- **画面** (最小3ページ):
  1. `GET  /`                — トップ (ロボット一覧、"カートに入れる" ボタン)
  2. `GET  /product/:sku`    — 商品詳細 (在庫数, 価格, スペック)
  3. `GET  /cart`            — カート + "注文確定" ボタン
- **API** (フロントから叩く):
  | メソッド | パス                      | 用途                              | バグ仕込み対象 |
  |---------|--------------------------|----------------------------------|:--:|
  | GET     | `/api/robots`            | 商品一覧                          |    |
  | GET     | `/api/robots/:sku`       | 商品詳細                          | ★ |
  | POST    | `/api/cart/items`        | カートに追加 `{sku, qty}`         |    |
  | GET     | `/api/cart`              | 現在のカート                      |    |
  | POST    | `/api/orders`            | 注文確定 `{payment_method, ...}`   | ★ |

- **ストレージ**: メモリ (Map)。永続化なし。カートは Cookie の `session_id` で紐付け。
- **商品データ** (初期4件、`data/robots.json`):
  ```json
  [
    {"sku":"RBT-ARM-01","name":"AssemblyArm α","price":198000,"stock":5},
    {"sku":"RBT-DOG-02","name":"WalkyDog Mk2","price":89800,"stock":0},
    {"sku":"RBT-CAT-03","name":"MeowBot ν","price":54800,"stock":12},
    {"sku":"RBT-HUM-04","name":"HumanoidX","price":1280000,"stock":1}
  ]
  ```

**ログ出力**: `demo-app/logs/app.log` (JSON Lines)。TrackID は既存 log_collector の抽出パターン `[A-Z0-9]{3,10}` にヒットする形式で、リクエスト毎にランダム発番。

**ログサンプル**:
```
2026-07-17T13:00:00.123Z INFO  TrackID:ORD8F2K [/api/orders] method=POST status=200 latency_ms=42
2026-07-17T13:00:12.456Z ERROR TrackID:ORD8F3M [/api/orders] method=POST status=500 \
  err=TypeError: Cannot read properties of undefined (reading 'toFixed') \
  at calcTotal (src/routes/orders.js:58:31)
```

### 5.2 バグ仕込みトグル (`demo-app/bug-config.json`) — 初期2バグ

```json
{
  "bugs": {
    "PRODUCT_STOCK_ZERO_NPE": {
      "enabled": true,
      "description": "GET /api/robots/:sku で在庫0の商品を見ると related_products を undefined で map しようとして TypeError",
      "affects": "src/routes/products.js#getProduct",
      "trigger": "SKU RBT-DOG-02 (stock=0) の詳細ページを開く",
      "user_impact": "在庫切れ商品ページが 500 になり離脱率上昇"
    },
    "ORDER_TOTAL_UNDEFINED_TAX": {
      "enabled": true,
      "description": "POST /api/orders で payment_method='invoice' のとき tax_rate が未定義になり total.toFixed() で TypeError",
      "affects": "src/routes/orders.js#calcTotal",
      "trigger": "決済方法「請求書払い」で注文確定",
      "user_impact": "法人向け請求書決済が全滅、機会損失甚大"
    }
  }
}
```

**設計意図**:
- **どちらのバグも EC で "痛い" 障害** — 詳細ページ落ち / 決済落ち。デモ映えする
- **切替式** — `enabled` を切り替えるだけで別障害を再演可能
- **bug-config.json はコード常駐** — AIエージェントは config を読むのではなく、あくまでログとソースを追って原因特定する (デモの誠実さ)
- **バグ内容はメタで持つ** — 運営側がどちらのバグを仕込んだか README で把握

### 5.3 障害検知 → Excel起票 (Step3の前段)

最小構成として `demo-app/watchdog.js` を用意:
- `logs/app.log` を tail
- `ERROR` 行を検知したら `incident_management.xlsx` に新規行を追加
  - インシデントID: 自動採番 (INC001, INC002 …)
  - タイムスタンプ: ログ行のTS
  - インシデント概要: ログ行そのまま
  - ステータス: `インシデント検出` (起票=確認待ち。人が「▶調査＆改修案」を押すまで停止)
- 同一TrackIDの2件目以降は既存行にマージ (件数++)

これで「バグ発火 → 自動起票」まで無人化される。

---

## 6. E2Eデモの起動 (単一コマンド)

`auto-repair-demo/orchestrator/run-demo.sh` 一発:

```bash
#!/bin/bash
# 1. Docker SSH サーバ起動 (既存)
(cd ../../dev-environment/docker && ./setup-containers.sh start)

# 2. demo-app を起動 (background)
(cd ../../demo-app && node server.js &)

# 3. watchdog を起動 (background)
(cd ../../demo-app && node watchdog.js &)

# 4. デモ用リクエストを流してバグを発火
curl -s http://localhost:3000/api/notes/2   # 偶数ID → 500
curl -s http://localhost:3000/api/notes/4

# 5. Excelドライバをフォアグラウンド起動 (状態機械が回る)
node excel-driver.js --xlsx ../examples/incident_management.xlsx
```

`--dry-run` フラグで PR 発行だけスキップする経路も用意。

---

## 7. 実装フェーズ (順序)

| Phase | 成果物 | 依存 |
|-------|--------|------|
| 0 | 本SPEC.md + DEMO_FLOW.md | なし |
| 1 | demo-app (server + views + logs + bug-config) | 0 |
| 2 | watchdog.js (Excel起票) | 1 |
| 3 | Excel状態遷移列を含む incident_management.xlsx 雛形 | 0 |
| 4 | orchestrator/excel-driver.js (状態機械) | 3 |
| 5 | incident-analyzer サブエージェント登録 | 4 |
| 6 | repair-planner サブエージェント登録 | 5 |
| 7 | pr-publisher サブエージェント登録 (承認ゲート) | 6 |
| 8 | E2E通し試験 + README | 1-7 |

**Phase 0 = 本ドキュメント** で完了。ユーザーレビュー後に Phase 1 に着手する。

---

## 8. 未決事項 / 議論待ち

1. **サブエージェントの呼び出し方式**: `claude --agent` CLI か / Anthropic API直叩き か。CLI依存を許容するかどうか。
2. **watchdog の実装粒度**: tail方式か / Express の middleware で直接Excel叩くか。前者の方が「ログを見て気付く」感が出るのでSPECは前者採用。
3. **本番用SSHか、demo-app 直読みか**: 「デモ」なので既存のDockerクラスタに demo-app のログを流し込むと重い。**demo-app は Docker コンテナ内 (server1) で動かして既存 SSH 経路をそのまま使う** のが素直。
4. **Excel破損対策**: 複数プロセスが同時書き込みすると xlsx が壊れる。excel-driver.js を **唯一の書き手** にし、他は "書きたい内容を stdout に JSON 出力 → driver が拾って書く" 契約にする。

---

## 9. 参考

- 既存 log_collector 仕様: `../CLAUDE.md`, `../README.md`
- 既存Skill登録: `../log-collector-skill/SKILL.md`
- 既存Agent登録: `../agent-registration/LOG_COLLECTOR_AGENT.md`
- Issue: https://github.com/shiftrepo/ai_workshop/issues/22
