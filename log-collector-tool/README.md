# ログ収集ツール

SSH経由で複数サーバーからログを収集する強力なツール。オンプレミスLinux環境向けに設計されています。

## 概要

ログ収集ツールは、タスク管理データに基づいて複数サーバーからのログ収集を自動化します：

- Excelタスク管理ファイルを読み込み、ログ収集が必要なタスクを識別
- 設定可能な正規表現パターンを使用してTrackID、プログラムID、タイムスタンプを抽出
- 複数サーバーに同時SSH接続
- 計算された時間範囲内の関連ログエントリを検索
- 包括的なExcelおよびCSVレポートを生成

## プロジェクト構成

```
log-collector-tool/
├── client/                      # コアアプリケーション（本番環境対応）
│   ├── log-collection-skill.js  # メインログ収集スクリプト
│   ├── log-collection-csv.js    # CSV出力版
│   ├── excel-to-csv.js          # Excel to CSV コンバーター
│   ├── examples/                # 設定とパターン
│   │   ├── log-patterns.json    # ログ解析用正規表現パターン
│   │   └── task_management_sample.xlsx  # サンプル入力
│   ├── output/                  # 生成されたレポート
│   └── package.json             # 依存関係
│
├── dev-environment/             # 開発とテスト（本番環境では不要）
│   ├── docker/                  # コンテナオーケストレーション
│   │   ├── Dockerfile           # コンテナ定義
│   │   ├── docker-compose.yml   # 3サーバークラスター
│   │   ├── setup-containers.sh  # コンテナ管理
│   │   └── DEPLOYMENT_GUIDE.md  # デプロイメント手順
│   ├── scripts/                 # テストと開発スクリプト
│   │   ├── startup.sh           # コンテナ初期化
│   │   ├── generate-logs.sh     # ログ生成
│   │   └── test-real-ssh.js     # SSHテスト
│   ├── sample-data/             # テストフィクスチャとSSHキー
│   │   ├── task_management_sample.xlsx
│   │   └── log_collector_key*   # SSHキー（テスト専用）
│   └── README.md                # 開発環境ガイド
│
├── CLAUDE.md                    # AI アシスタントガイダンス
└── README.md                    # このファイル
```

## クイックスタート

### 本番環境での使用

1. **依存関係のインストール:**

```bash
cd client
npm install
```

2. **SSHとパターンの設定:**

`.env` ファイルを作成するか、環境変数を設定：

```bash
export SSH_HOST_1=your-server1.com
export SSH_HOST_2=your-server2.com
export SSH_HOST_3=your-server3.com
export SSH_PORT_1=22
export SSH_PORT_2=22
export SSH_PORT_3=22
export SSH_USER=your-ssh-user
export SSH_KEY_PATH=/path/to/your/ssh/key
export INPUT_FOLDER=./input
export OUTPUT_FOLDER=./output
export LOG_PATTERN_FILE=./examples/log-patterns.json
```

3. **タスク管理ファイルの準備:**

入力フォルダーにExcelタスク管理ファイルを配置（以下の列が必要）：
- インシデントID (Incident ID)
- タイムスタンプ (Timestamp)
- インシデント概要 (Description with TrackIDs)
- ステータス (Status - 収集対象は「情報収集中」)

4. **ログ収集の実行:**

```bash
cd client
node log-collection-skill.js
```

### 開発・テスト

Dockerコンテナを使用した開発・テスト環境：

```bash
cd dev-environment/docker
./setup-containers.sh start
```

詳細は `dev-environment/README.md` を参照してください。

## 主要機能

### 複数サーバーSSH収集

- 複数サーバーへの同時接続
- 鍵ベース認証
- 並列ログ検索操作
- サーバーごとのエラーハンドリング

### パターンベース抽出

`log-patterns.json` で設定可能な正規表現パターン：

```json
{
  "patterns": {
    "trackId": {
      "pattern": "(?:TrackID|trackId)[:\\s\"]*([A-Z0-9]{3,10})",
      "flags": "gi"
    },
    "programId": {
      "pattern": "\\b([A-Z]{2,6}\\d{2,4})\\b",
      "flags": "g"
    },
    "timestamp": {
      "pattern": "(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2})",
      "flags": "g"
    }
  },
  "timeRanges": {
    "searchBefore": 1800,  # 30分前
    "searchAfter": 1800    # 30分後
  }
}
```

### レポート生成

ExcelとCSVの両形式でレポート生成：
- タスクID
- TrackID
- プログラムID
- サーバー名
- タイムスタンプ
- ログレベル
- ログパス
- 完全なログ内容

## 設定

### 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `SSH_HOST_*` | サーバーホスト名 | localhost |
| `SSH_PORT_*` | SSHポート | 5001, 5002, 5003 |
| `SSH_USER` | SSHユーザー名 | logcollector |
| `SSH_KEY_PATH` | SSH秘密鍵のパス | ./examples/log_collector_key |
| `INPUT_FOLDER` | タスク管理ファイルの場所 | ./examples |
| `OUTPUT_FOLDER` | レポート出力ディレクトリ | ./output |
| `LOG_PATTERN_FILE` | パターン設定ファイル | ./examples/log-patterns.json |

### ログパターン設定

`client/examples/log-patterns.json` を編集してカスタマイズ：
- TrackID抽出パターン
- プログラムIDパターン
- タイムスタンプフォーマット
- 検索用時間範囲ウィンドウ

### サーバーログパス

`log-collection-skill.js` で設定：

```javascript
logPaths: [
  '/var/log/application.log',
  '/var/log/app/*.log',
  '/tmp/logs/*.log'
]
```

## 出力形式

### Excelレポート

- **サマリーシート**: 総ログ件数を含むタスク概要
- **詳細シート**: タスクごとの完全なコンテキストを含むログエントリ
- ヘッダーとフィルター付きでフォーマット

### CSVレポート

すべてのログエントリを含む単一CSVファイル：

```csv
Task ID,TrackID,Program ID,Server,Timestamp,Log Level,Log Path,Content
INC001,ABC123,AUTH101,server1,2025-11-22 10:30:00,ERROR,/var/log/app.log,"Full log entry..."
```

## 必要要件

### 本番環境

- Node.js 14.x以上
- ターゲットサーバーへのSSHアクセス
- 認証用SSH秘密鍵
- Excelタスク管理ファイル (.xlsx)

### 開発環境

開発・テスト用の追加要件：
- DockerまたはPodman
- Docker Compose
- 推奨8GB RAM
- ポート5001-5003が利用可能

## 依存関係

コア依存関係（自動インストール）：
- `exceljs`: Excelファイル処理
- `ssh2`: サーバー接続用SSHクライアント
- `chalk`: コンソール出力フォーマット（オプション）

## セキュリティ考慮事項

### 本番環境デプロイメント

- **SSHキー**: 制限された権限を持つ専用SSHキーを使用
- **ユーザー権限**: 最小限のログ読み取り権限を持つ非rootSSHユーザーを使用
- **ネットワークセキュリティ**: セキュアなネットワーク経由でのSSH接続を確保
- **キー管理**: SSH秘密鍵をリポジトリにコミットしない
- **入力検証**: 処理前にタスク管理ファイルを検証

### 開発環境

⚠️ **`dev-environment/sample-data/` の開発用キーはテスト専用です！**

本番環境では以下のキーを使用しないでください：
- `log_collector_key*`
- `mock_ssh_key.pem*`

## トラブルシューティング

### SSH接続失敗

```bash
# SSH接続を手動でテスト
ssh -i /path/to/key -p PORT user@host

# SSHキーのパーミッションを確認（600である必要があります）
chmod 600 /path/to/ssh/key

# ターゲットサーバーでユーザーがログ読み取り権限を持つことを確認
ssh -i /path/to/key -p PORT user@host "ls -la /var/log/app/"
```

### ログが見つからない

- サーバーログにTrackIDが存在することを確認: `grep "TrackID" /var/log/app/*.log`
- 出力の時間範囲計算を確認
- ログパス設定がサーバー設定と一致することを確認
- `log-patterns.json` のログパターン正規表現を確認

### Excel処理エラー

- Excelファイル形式が.xlsxであることを確認
- 列名が期待される日本語ヘッダーと一致することを確認
- 「情報収集中」ステータスが正確であることを確認（文字を含む）

## パフォーマンス

- **並列操作**: すべてのサーバーに同時接続
- **タイムアウト管理**: SSH接続タイムアウト30秒、検索タイムアウト60秒
- **メモリ使用量**: アクティブなSSH接続あたり約50MB
- **典型的な収集時間**: 20-50ログエントリの3サーバーで10-30秒

## 制限事項

- 最大3サーバー設定（コード修正で拡張���能）
- Excelファイルは日本語タスク管理フォーマットに従う必要があります
- SSH鍵ベース認証のみ（パスワード認証不可）
- ログファイルはテキストベースでgrep検索可能である必要があります

## 使用例

### 基本的な収集

```bash
cd client
node log-collection-skill.js
```

### CSV出力のみ

```bash
cd client
node log-collection-csv.js
```

### カスタム設定

```bash
cd client
SSH_KEY_PATH=/path/to/custom/key \
INPUT_FOLDER=/path/to/tasks \
OUTPUT_FOLDER=/path/to/reports \
node log-collection-skill.js
```

## 開発

以下については `dev-environment/README.md` を参照：
- 開発環境セットアップ
- コンテナ管理
- テストスクリプト使用方法
- サンプルデータ生成
- SSH接続テスト

## ライセンス

ISC

## サポート

問題や質問については：
1. AIアシスタントコンテキストについては `CLAUDE.md` を確認
2. 開発セットアップについては `dev-environment/README.md` を確認
3. デプロイメント詳細については `dev-environment/docker/DEPLOYMENT_GUIDE.md` を確認
