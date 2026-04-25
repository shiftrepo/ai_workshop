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
