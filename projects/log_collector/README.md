# Log Collector — ログ収集ツール

SSH経由で複数サーバーからログを自動収集するNode.jsツール。  
Excelタスク管理ファイルと連携し、インシデント対応に必要なログを一括取得・レポート化します。

---

## 📦 プロジェクト構成

```
log_collector/
├── README.md               # このファイル
├── CLAUDE.md               # Claude Code 向け説明ファイル
├── client/                 # 本番環境用コア（Windows/Linux）
│   ├── log-collection-skill.js   # メインスクリプト（Excel + CSV出力）
│   ├── log-collection-csv.js     # CSV出力専用版
│   ├── excel-to-csv.js           # Excel→CSVコンバーター
│   ├── examples/                 # サンプル設定・入力ファイル
│   │   ├── log-patterns.json     # 正規表現パターン設定
│   │   └── task_management_sample.xlsx
│   ├── output/                   # 生成レポート出力先
│   └── package.json
└── dev-environment/        # 開発・テスト環境（本番不要）
    ├── docker/             # Dockerコンテナ（3サーバークラスター）
    ├── scripts/            # テスト・初期化スクリプト
    └── sample-data/        # テスト用SSHキー・フィクスチャ
```

---

## 🚀 クイックスタート（本番環境）

```bash
cd client
npm install

# 環境変数を設定（Windowsの場合）
set SSH_KEY_PATH=C:\path\to\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector

# ログ収集実行
npm run log-collect        # Excel + CSV レポート生成
npm run log-collect-csv    # CSV のみ
```

---

## 🔧 開発・テスト環境（Docker）

```bash
cd dev-environment/docker

# コンテナ起動（3サーバーSimulation）
./setup-containers.sh rebuild   # 初回
./setup-containers.sh start     # 2回目以降

# SSH接続テスト
cd ../scripts
node test-real-ssh.js
```

---

## 📋 対応Excel形式（日本語ヘッダー）

| 列 | ヘッダー | 内容 |
|----|----------|------|
| A | インシデントID | タスク識別子（例：INC001） |
| B | タイムスタンプ | インシデント発生時刻 |
| C | インシデント概要 | TrackID等を含む説明文 |
| D | 担当者 | 担当者名 |
| E | ステータス | **「情報収集中」** のタスクのみ収集対象 |
| F | 調査状況 | 調査メモ |

---

## ⚙️ 主な環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `SSH_KEY_PATH` | ✅ | SSH秘密鍵のパス |
| `SSH_HOST_1` | ✅ | 接続先サーバーのIP/ホスト名 |
| `SSH_PORT_1` | ✅ | SSHポート番号 |
| `SSH_USER` | ✅ | SSHユーザー名 |
| `SSH_HOST_2`, `SSH_HOST_3` | — | 追加サーバー（省略可） |
| `INPUT_FOLDER` | — | Excelファイルの場所（デフォルト: `./examples`） |
| `OUTPUT_FOLDER` | — | レポート出力先（デフォルト: `./output`） |

---

## 📖 関連ドキュメント

- [開発環境ガイド](dev-environment/docker/DEPLOYMENT_GUIDE.md)
- [SSHキー作成と登録](../../doc/SSHキー作成と登録.md)
- [リポジトリ全体の README に戻る](../../README.md)

---

## 🤖 Issue #22 — AI 自動改修デモの実行方法

Web アプリのバグ発火 → ログ収集 → AI 一次解析 → AI 改修案提示 → 人手承認 → PR 発行 までを一気通貫で流すデモ。

### アクセス URL (外部ドメインベース)

本デモが公開する2つのエンドポイント。

| 用途 | 外部URL | ローカル代替 | ポート |
|------|---------|-------------|:--:|
| RoboMart Web アプリ (バグ発火用) | http://ec2-54-88-196-71.compute-1.amazonaws.com:3002 | `http://localhost:3002` | **3002** |
| Incident Console (Excel閲覧+編集) | http://ec2-54-88-196-71.compute-1.amazonaws.com:4001 | `http://localhost:4001` | **4001** |

**ポート選定理由**: この EC2 の SG (`SG-SHIFT-hermes-dev`) で外部公開可能な範囲 (3000-3003 / 4000-4003) のうち、既存プロセスと衝突しないポートを選択。litellm が :4000 を使用しているため Web UI は :4001。

> 別環境で使う場合は、環境変数 `PORT=3000` (RoboMart) / `WEB_UI_PORT=4000` (Web UI) で上書きしてください。
> HTTPS 化する場合は上位プロキシ (nginx/ALB) で TLS 終端を追加してください。現状は HTTP のみ。

### 事前準備 (初回のみ)

```bash
# demo-app (RoboMart) の依存インストール
cd projects/log_collector/demo-app
npm install

# orchestrator の依存インストール
cd ../auto-repair-demo/orchestrator
npm install

# Excel 雛形の生成 (A〜L 12列のヘッダのみ空 xlsx)
node scripts/gen-template.js
```

### 実行手順 (毎回のデモ)

#### ステップ 1: サービス群を起動

```bash
cd projects/log_collector/auto-repair-demo/orchestrator
./run-demo.sh
```

`run-demo.sh` が自動で以下を実施:

1. Excel をテンプレートからリセット (空)
2. `demo-app/logs/app.log` を空に
3. 有効なバグ (`bug-config.json` の `enabled: true`) を stdout に表示
4. RoboMart (Express) を port 3002 で起動 → **http://ec2-54-88-196-71.compute-1.amazonaws.com:3002** で公開 (background)
5. watchdog を起動 (ERROR ログ検知 → Excel 起票)
6. **Web UI (Excel閲覧+編集+状態機械操作) を port 4001 で起動** → **http://ec2-54-88-196-71.compute-1.amazonaws.com:4001** で公開 (background)

**バグ発火も状態機械の実行も、Web UI から手動で行います** (デモ演出のため常時ポーリングはOFF)。

`--fire-bugs` を渡すと curl でバグを自動発火します (リハーサル用)。

#### ステップ 2: ブラウザで RoboMart と Web UI を開く

**RoboMart** (バグを発火する EC 画面):
- http://ec2-54-88-196-71.compute-1.amazonaws.com:3002

**Incident Console** (Excel 閲覧+編集+状態機械操作):
- http://ec2-54-88-196-71.compute-1.amazonaws.com:4001

RoboMart で以下の操作をするとバグが発火し、watchdog が Excel にインシデント行を append します:

| 操作 | 発火バグ |
|------|---------|
| "WalkyDog Mk2" (在庫切れ表記) をクリック | ★1 PRODUCT_STOCK_ZERO_NPE (500 error) |
| 在庫あり商品をカートに入れる → 決済方法「請求書払い」で注文確定 | ★2 ORDER_TOTAL_UNDEFINED_TAX (500 error) |

Web UI (別タブ) を眺めていると、数秒後にインシデント行が現れます。

#### ステップ 3: 状態機械を Web UI から進める

Excel は `情報収集中` で自動停止しています (常時ポーリング OFF)。デモ演出上、演者が説明しながら次段に進めます:

**Web UI のボタン**:

| ボタン | 動作 |
|--------|------|
| 各行の **▶ 進める** | 対象1行だけを次段へ (情報収集中→解析待ち, 解析待ち→改修案作成待ち, 改修案作成待ち→要承認, PR作成待ち→対応完了) |
| **▶ 全行を1tick進める** | 現在アクティブな全行を1tickずつ進める |
| **🔁 デモリセット** | Excel を空に + logs を空に + Excel 内 PR URL の PR を close + branch 削除 (`gh pr close --delete-branch`) |
| **再読込** / **自動再読込** | 表示のみ更新 (状態遷移はしない) |

**状態遷移で書き込まれる列**:

| 遷移 | 書き込み担当 | 書き込み列 |
|------|-------------|-----------|
| 情報収集中 → 解析待ち | log-collector-skill (既存) | G 収集ログサマリ |
| 解析待ち → 改修案作成待ち | `incident-analyzer` サブエージェント (Sonnet 4.5) | H 一次解析結果 (~1000-1300文字) |
| 改修案作成待ち → 要承認 | `repair-planner` サブエージェント (Sonnet 4.5) | I 改修案 (~1700-3000文字, unified diff付き) |

各遷移には数十秒〜3分かかります (Claude CLI の応答待ち)。処理中は "in-flight" と Web UI 下部のログパネルに表示されます。

Web UI 画面のカラム:

| 列 | 内容 | 編集可否 |
|----|------|:--:|
| ID | インシデントID | 不可 |
| 時刻 | タイムスタンプ | 不可 |
| 概要 | エラー概要 (TrackID付き) | 不可 |
| 担当者 | 担当者名 | ✅ 編集可 |
| ステータス | 状態機械の状態 (ドロップダウン) | ✅ 編集可 |
| 調査状況 | 調査メモ | ✅ 編集可 |
| 収集ログ | log_collector の結果 | 不可 |
| 一次解析 | incident-analyzer の結果 | 不可 |
| 改修案 | repair-planner の diff案 | 不可 |
| 承認者 | 承認者名 | ✅ 編集可 |
| PR URL | pr-publisher の発行PR (クリック可) | 不可 |
| 最終更新 | ISO 8601 タイムスタンプ | 不可 |

#### ステップ 4: 人手ゲート — Web UI で承認 (Office不要)

`要承認` に到達した後は自動遷移しません。改修案列 (I) を確認したら:

1. **承認者** セルに自分の名前を入力してフォーカスを外す (即Excel保存)
2. **ステータス** ドロップダウンで `要承認` → **`PR作成待ち`** に変更する (即Excel保存)
3. 該当行の **▶ 進める** ボタンをクリック

編集は change イベントで自動保存され、Excel ファイル (`incident_management.xlsx`) に即座に書き込まれます。**Excel を開く必要はない**。

#### ステップ 5: PR 自動発行

**▶ 進める** ボタンが `pr-publisher` サブエージェントを起動し:

1. `main` から `fix/inc<番号>-...` ブランチを切る
2. I 列に書かれた diff 案を実コードに適用
3. `npm test` があれば実行 (失敗時は Draft PR)
4. コミット + push
5. `gh pr create` で PR を発行
6. **K 列 (PR URL)** に URL を書き戻し
7. **E 列 (ステータス)** を `対応完了` に更新

以上でデモ完了。子プロセス (demo-app / watchdog / web-ui) を停止するには:

```bash
pkill -f "node server.js"
pkill -f "node watchdog.js"
pkill -f "node web-ui.js"
```

### デモを別のバグでやり直す

**Web UI の "🔁 デモリセット" ボタン**で以下が一括実施されます:

1. Excel を空 (ヘッダのみ) にリセット
2. `demo-app/logs/app.log` を空に
3. Excel 内の PR URL 全てを `gh pr close --delete-branch` で閉じる (チェックを外せばスキップ可)

その後、必要に応じて `bug-config.json` を編集し、ブラウザで再度バグを発火させます。

```bash
# bug-config.json を編集して enabled を切り替え
$EDITOR projects/log_collector/demo-app/bug-config.json
# 変更後は demo-app を再起動: pkill -f "node server.js" && cd projects/log_collector/demo-app && node server.js &
```

### dry-run (PR を実発行せず流れだけ確認したいとき)

```bash
./run-demo.sh --dry-run
```

- `log_collector` は起動せず、`collect_summary` にスタブ文字列を書く
- 3 サブエージェントは呼び出されず、各列にはスタブが入る
- 状態遷移は本番と同じで、人手ゲートで止まる → 承認シミュレートで対応完了まで進む

### 単発 tick (デバッグ用)

```bash
cd projects/log_collector/auto-repair-demo/orchestrator
node excel-driver.js --dry-run --once
```

1 サイクルだけ回して終了。CI や TDD で使える。

### トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| `EADDRINUSE :::3002` | 他のプロセスが port 3002 を占有 | `PORT=3003 node server.js` で回避 (SG範囲 3000-3003 内で選ぶ) |
| `EADDRINUSE :::4001` (Web UI) | 他のプロセスが port 4001 を占有 | `WEB_UI_PORT=4002 node web-ui.js` で回避 (SG範囲 4000-4003 内で選ぶ) |
| Web UI が空表示 (`xxx が存在しません`) | Excel ファイル未生成 | `run-demo.sh` を実行するか `node scripts/gen-template.js` |
| `no output (exit 1, ログサーバ未起動...)` in G列 | Docker SSH コンテナ未起動 | `cd dev-environment/docker && ./setup-containers.sh start` |
| `agent xxx timed out after 180000ms` | `claude` CLI 応答遅延 | ネットワーク/Bedrock状態を確認、L列の "最終更新" で再試行判定 |
| Excel が壊れる/開けない | 複数プロセスの同時書込 | `excel-driver.js` を1本のみ起動する。 watchdog も1本のみ |
| `pr-publisher` が発火しない | J列 (承認者) が空、E列が "PR作成待ち" になっていない | Excel を再確認して保存し直す |

### 関連ドキュメント

- 全体設計・状態遷移仕様: [auto-repair-demo/SPEC.md](auto-repair-demo/SPEC.md)
- E2E 時系列シナリオ: [auto-repair-demo/DEMO_FLOW.md](auto-repair-demo/DEMO_FLOW.md)
- RoboMart 単体の README: [demo-app/README.md](demo-app/README.md)
- サブエージェント定義: [../../.claude/agents/](../../.claude/agents/)
