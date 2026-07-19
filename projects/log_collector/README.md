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
| B | TrackID | 同一トランザクションのアプリ層/サービス層ログを紐づける一意ID |
| C | タイムスタンプ | インシデント発生時刻 |
| D | インシデント概要 | TrackID等を含む説明文 |
| E | 担当者 | 担当者名 |
| F | ステータス | 既定では **「情報収集中」** のタスクのみ収集対象 (環境変数 `FILTER_STATUS` で変更可。auto-repair-demo では「インシデント検出」を指定) |
| G | 調査状況 | 調査メモ |

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

## 🤖 Issue #22 — AI 自動改修デモ

Web アプリ (RoboMart) のバグ発火 → ログ収集 → AI 一次解析 → AI 改修案提示 → 人手承認 → PR 発行 までを一気通貫で流すデモ。**Office不要**、ブラウザだけで完結する。

### アクセス URL

| 用途 | URL |
|------|-----|
| RoboMart Web アプリ (バグ発火用) | ポート **8888** (HTTPS, Caddy経由) / 内部 `http://localhost:3002` |
| Incident Console (Excel 閲覧+編集+操作) | ポート **8081** (HTTPS, Caddy経由) / 内部 `http://localhost:4001` |

### 全体像を図で見る

構成・状態遷移・シーケンスは mermaid 図で整理しています:

👉 **[auto-repair-demo/ARCHITECTURE.md](auto-repair-demo/ARCHITECTURE.md)**

### クイックスタート

```bash
# 事前準備 (初回のみ)
cd projects/log_collector/demo-app && npm install
cd ../auto-repair-demo/orchestrator && npm install && node scripts/gen-template.js
# Docker SSH ログサーバ (実ログ収集する場合)
cd ../../dev-environment/docker && ./setup-containers.sh start

# デモ起動 (RoboMart + watchdog + Web UI を一括起動)
cd ../../auto-repair-demo/orchestrator && ./run-demo.sh
```

1. ブラウザで **RoboMart** を開き、在庫切れ商品クリック or 請求書払い注文 → バグ発火
2. **Incident Console** に `インシデント検出` として自動起票される
3. 行の **▶ 調査＆改修案** ボタン → ログ収集→解析→改修案 を実行し `要承認` で停止 (数分)
4. 改修案を確認 → **承認者**を記入し**ステータス**を `PR作成待ち` に変更 → `pr-publisher` が自動で PR 発行

デモ手順・操作・設定・トラブルシュートの詳細は **[auto-repair-demo/README.md](auto-repair-demo/README.md)** を参照。

### 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [auto-repair-demo/ARCHITECTURE.md](auto-repair-demo/ARCHITECTURE.md) | 構成図・状態遷移図・シーケンス図 (mermaid) |
| [auto-repair-demo/README.md](auto-repair-demo/README.md) | デモ実行手順・Web UI 操作・設定・トラブルシュート |
| [auto-repair-demo/SPEC.md](auto-repair-demo/SPEC.md) | 全体設計・Excel列定義・状態機械・エージェント責務 |
| [auto-repair-demo/DEMO_FLOW.md](auto-repair-demo/DEMO_FLOW.md) | E2E 時系列シナリオ (演者トーク付き脚本) |
| [demo-app/README.md](demo-app/README.md) | RoboMart 単体 (バグ2種・ログ形式) |
| [../../.claude/agents/](../../.claude/agents/) | サブエージェント定義 3本 |
