# ログ収集ツール 開発環境

このディレクトリには、ログ収集ツールの開発とテストのためのインフラストラクチャが含まれています。

## ディレクトリ構成

```
dev-environment/
├── docker/                  # Dockerコンテナ化
│   ├── Dockerfile           # コンテナイメージ定義
│   ├── docker-compose.yml   # 3サーバークラスターオーケストレーション
│   ├── setup-containers.sh  # コンテナ管理スクリプト
│   ├── .env.example         # 環境設定テンプレート
│   └── DEPLOYMENT_GUIDE.md  # 詳細なデプロイメント手順
├── scripts/                 # テストと開発スクリプト
│   ├── startup.sh           # コンテナ初期化スクリプト
│   ├── generate-logs.sh     # 継続的ログ生成
│   ├── generate-diverse-logs.sh  # 初期多様ログデータ
│   ├── test-real-ssh.js     # SSH接続テスト
│   ├── production-test.js   # 本番環境シミュレーション
│   ├── simulate-csv-report.js    # CSVレポート生成テスト
│   ├── analyze_patterns.js       # パターン分析ツール
│   ├── check_search_patterns.js  # 検索パターン検証
│   └── comprehensive_pattern_analysis.js  # 包括的パターンテスト
└── sample-data/             # サンプルデータとテストフィクスチャ
    ├── task_management_sample.xlsx  # サンプルタスク管理ファイル
    ├── log_collector_key*           # SSH認証キー
    └── mock_ssh_key.pem*           # 代替SSHキー

```

## クイックスタート

### 開発環境の起動

```bash
cd dev-environment/docker
./setup-containers.sh start
```

### ゼロから再構築

```bash
cd dev-environment/docker
./setup-containers.sh rebuild
```

### 環境の停止

```bash
cd dev-environment/docker
./setup-containers.sh stop
```

### ステータス確認

```bash
cd dev-environment/docker
./setup-containers.sh status
```

## コンテナアーキテクチャ

開発環境は3サーバークラスターを作成します：

- **log-server1-issue15**: ポート5001 (SSH)
- **log-server2-issue15**: ポート5002 (SSH)
- **log-server3-issue15**: ポート5003 (SSH)
- **log-client-issue15**: テストクライアントコンテナ

すべてのコンテナは `log-collection-network` ブリッジ経由で接続されています。

## SSH設定

### デフォルトSSH設定

- **ユーザー**: `logcollector`
- **認証**: SSH鍵ベース（パスワードなし）
- **キー場所**: `sample-data/log_collector_key`
- **ポート**: 5001, 5002, 5003がコンテナポート22にマップ

### 手動SSH接続テスト

```bash
ssh -i dev-environment/sample-data/log_collector_key -p 5001 logcollector@localhost
```

## ログ生成

コンテナ起動時にログが自動生成されます：

- **初期ログ**: `generate-diverse-logs.sh` により作成
- **継続的ログ**: 環境変数 `CONTINUOUS_LOGS=true` で有効化
- **ログ保存場所**:
  - `/var/log/app/*.log` - アプリケーションログ
  - `/tmp/logs/*.log` - 一時ログ

### テストログファイル

小さなテストログファイルが `/tmp/logs/test_sample.log` に制御されたTrackIDで作成されます：

- `SAMPLE001`: 単一TrackIDパターン（3サーバーで13エントリ）
- `MULTI001`, `MULTI002`: 複数TrackIDパターン（3サーバーで4エントリ）

## テストスクリプト

### SSH接続テスト

```bash
cd dev-environment/scripts
node test-real-ssh.js
```

### 本番環境シミュレーション

```bash
cd dev-environment/scripts
node production-test.js
```

### パターン分析

```bash
cd dev-environment/scripts
node analyze_patterns.js
node check_search_patterns.js
node comprehensive_pattern_analysis.js
```

## サンプルデータ

### タスク管理サンプル

ファイル `sample-data/task_management_sample.xlsx` にはサンプルタスクが含まれています：

| タスクID | ステータス | TrackID | 説明 |
|---------|-----------|---------|------|
| INC001  | 情報収集中 | SAMPLE001 | 単一TrackIDテストケース |
| INC002  | 情報収集中 | MULTI001, MULTI002 | 複数TrackIDテストケース |
| INC003  | 対応完了 | N/A | 完了（収集対象外） |

### SSHキー

テスト用に複数のSSHキーペアが提供されています：

- `log_collector_key` / `log_collector_key_pem`: メインキー
- `mock_ssh_key.pem`: 代替キー

**注意**: これらはテスト専用キーです。**本番環境では使用しないでください。**

## 環境変数

`.env` ファイルで設定（`.env.example` を参照）：

```bash
# サーバー設定
SSH_HOST_1=localhost
SSH_HOST_2=localhost
SSH_HOST_3=localhost
SSH_PORT_1=5001
SSH_PORT_2=5002
SSH_PORT_3=5003
SSH_USER=logcollector

# パス
SSH_KEY_PATH=./dev-environment/sample-data/log_collector_key
INPUT_FOLDER=./client/examples
OUTPUT_FOLDER=./client/output
LOG_PATTERN_FILE=./client/examples/log-patterns.json

# ログ生成
CONTINUOUS_LOGS=true
LOG_SERVER_ID=server1
```

## トラブルシューティング

### コンテナが起動しない

```bash
# Dockerデーモンを確認
docker ps

# コンテナログを表示
docker logs log-server1-issue15

# 完全に再構築
cd dev-environment/docker
./setup-containers.sh rebuild
```

### SSH接続失敗

```bash
# コンテナのSSHデーモンを確認
docker exec log-server1-issue15 ps aux | grep ssh

# SSHキーのパーミッションを確認
ls -la dev-environment/sample-data/log_collector_key

# SSH接続を手動でテスト
ssh -v -i dev-environment/sample-data/log_collector_key -p 5001 logcollector@localhost
```

### ポート競合

ポート5001-5003が既に使用されている場合：

1. `docker/docker-compose.yml` を編集
2. ポートマッピングを変更（例：`"5001:22"` → `"6001:22"`）
3. 環境変数を適宜更新

## 本番環境 vs 開発環境

この開発環境は**本番環境での使用を想定していません**：

- テスト用SSHキーを使用
- 利便性のため一部のセキュリティ機能を無効化
- 合成ログデータを生成
- 非セキュアモードでコンテナを実行

本番環境デプロイメントについては以下を参照：
- `docker/DEPLOYMENT_GUIDE.md`
- メインプロジェクトの `README.md`
- `scripts/production-setup-example.sh` の本番環境セットアップ例

## 次のステップ

開発環境セットアップ後：

1. コンテナの健全性を確認: `./setup-containers.sh status`
2. SSH接続をテスト: `ssh -i ../sample-data/log_collector_key -p 5001 logcollector@localhost`
3. メインプロジェクトからログ収集を実行: `cd ../../client && node log-collection-skill.js`
4. 生成されたレポートを確認: `ls -la client/output/`

## クリーンアップ

開発環境を完全に削除するには：

```bash
cd dev-environment/docker
./setup-containers.sh clean

# オプション: サンプルデータを削除
rm -rf dev-environment/sample-data/*
```
