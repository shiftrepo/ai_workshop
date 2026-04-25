# 別環境での Log Collector Tool デプロイメントガイド

このドキュメントは、Log Collector Tool を異なる環境（本番環境、他の開発環境）で動作させるための完全なガイドです。

## 🌍 環境独立性の証明

### ✅ 依存関係分析
```json
最小限の依存関係（package.json）:
- Node.js runtime (v12以上)
- ssh2: ^1.15.0        (SSH接続ライブラリ)
- exceljs: ^4.4.0      (Excel処理ライブラリ)
- chalk: ^4.1.2        (コンソール色付け - オプション)
```

### ✅ 環境設定の完全な独立性
すべての設定は環境変数で制御可能：
- サーバー接続情報（ホスト、ポート、ユーザー）
- ファイルパス（入力、出力、SSH鍵、パターン設定）
- ログ検索パス

## 🚀 ステップ別デプロイメント手順

### 1. システム要件
```bash
# 最小システム要件
- OS: Linux, Windows, macOS
- Node.js: v12.0.0 以上
- RAM: 512MB 以上
- ディスク: 100MB 以上
- ネットワーク: SSH接続可能な環境
```

### 2. インストール手順

#### A. Node.js環境の準備
```bash
# Node.js のインストール確認
node --version  # v12.0.0 以上であることを確認
npm --version

# 新しい環境でのプロジェクト設定
mkdir log-collector-production
cd log-collector-production
```

#### B. プロジェクトファイルのコピー
```bash
# 必要なファイルのみをコピー（コンテナ関連ファイルは不要）
必須ファイル:
├── client/
│   ├── package.json                    # 依存関係定義
│   ├── log-collection-skill.js         # メイン実行ファイル
│   ├── log-collection-csv.js           # CSV出力版
│   └── examples/                       # 設定とサンプル
│       ├── log-patterns.json           # ログパターン設定
│       └── task_management_sample.xlsx # サンプルタスク管理表
└── README.md                           # 使用方法

不要ファイル（本番環境では除外）:
├── Dockerfile                   # コンテナ専用
├── docker-compose.yml          # コンテナ専用
├── setup-containers.sh         # コンテナ専用
├── tests/                      # 開発専用
└── client/startup.sh           # コンテナ専用
```

#### C. 依存関係のインストール
```bash
cd client
npm install --production  # 本番環境用（devDependencies除外）
```

### 3. 環境設定

#### A. 環境変数の設定
```bash
# Linux/macOS の場合
export SSH_HOST_1="your-server1.example.com"
export SSH_HOST_2="your-server2.example.com"
export SSH_HOST_3="your-server3.example.com"
export SSH_PORT_1=22
export SSH_PORT_2=22
export SSH_PORT_3=22
export SSH_USER="your-ssh-user"
export SSH_KEY_PATH="/path/to/your/private-key.pem"
export INPUT_FOLDER="/path/to/excel-files"
export OUTPUT_FOLDER="/path/to/output"
export LOG_PATTERN_FILE="/path/to/log-patterns.json"

# Windows の場合
set SSH_HOST_1=your-server1.example.com
set SSH_HOST_2=your-server2.example.com
set SSH_HOST_3=your-server3.example.com
set SSH_PORT_1=22
set SSH_PORT_2=22
set SSH_PORT_3=22
set SSH_USER=your-ssh-user
set SSH_KEY_PATH=C:\path\to\your\private-key.pem
set INPUT_FOLDER=C:\path\to\excel-files
set OUTPUT_FOLDER=C:\path\to\output
set LOG_PATTERN_FILE=C:\path\to\log-patterns.json
```

#### B. SSH鍵の準備
```bash
# SSH鍵ペアの生成（必要な場合）
ssh-keygen -t rsa -b 2048 -f /path/to/your-key
chmod 600 /path/to/your-key        # Linux/macOS
icacls key.pem /inheritance:r /grant:r %username%:R  # Windows

# 公開鍵をサーバーに配置
ssh-copy-id -i /path/to/your-key.pub user@server1.example.com
ssh-copy-id -i /path/to/your-key.pub user@server2.example.com
ssh-copy-id -i /path/to/your-key.pub user@server3.example.com
```

### 4. 設定ファイルのカスタマイズ

#### A. ログパターン設定（log-patterns.json）
```json
{
  "patterns": {
    "trackId": {
      "pattern": "TrackID:\\s*([A-Z0-9]{3,10})",
      "flags": "gi"
    },
    "programId": {
      "pattern": "\\b([A-Z]{2,6}\\d{2,4})\\b",
      "flags": "g"
    },
    "timestamp": {
      "pattern": "(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2})",
      "flags": "g"
    },
    "logLevel": {
      "pattern": "\\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|TRACE)\\b",
      "flags": "i"
    }
  },
  "timeRanges": {
    "defaultRange": 3600,
    "searchBefore": 1800,
    "searchAfter": 1800
  },
  "logFormats": [
    {
      "pattern": "^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})",
      "groups": ["timestamp"]
    },
    {
      "pattern": "^\\[(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z)\\]",
      "groups": ["timestamp"]
    }
  ]
}
```

#### B. カスタムログパス設定
ツール内で `logPaths` 配列を環境に応じて変更：
```javascript
// 例：Windowsサーバーの場合
logPaths: [
    'C:\\logs\\application.log',
    'C:\\inetpub\\logs\\*.log',
    'D:\\app\\logs\\*.log'
]

// 例：Linuxサーバーの場合
logPaths: [
    '/var/log/your-app/*.log',
    '/opt/application/logs/*.log',
    '/home/user/logs/*.log'
]
```

### 5. 接続テスト

#### A. SSH接続テスト
```bash
# 各サーバーへの接続確認
ssh -i /path/to/your-key user@server1.example.com "echo 'Server1 OK'"
ssh -i /path/to/your-key user@server2.example.com "echo 'Server2 OK'"
ssh -i /path/to/your-key user@server3.example.com "echo 'Server3 OK'"

# ログファイルへのアクセス確認
ssh -i /path/to/your-key user@server1.example.com "ls -la /var/log/application.log"
```

#### B. 実行テスト
```bash
# ドライランモード（接続テストのみ）
node log-collection-skill.js --dry-run

# 完全実行
node log-collection-skill.js
```

### 6. 本番環境での実行

#### A. スケジュール実行（cron）
```bash
# Linux/macOS crontab設定例
# 毎日午前9時に実行
0 9 * * * cd /path/to/log-collector && /usr/bin/node log-collection-skill.js >> /var/log/log-collector.log 2>&1

# 環境変数を含むスクリプト実行
0 9 * * * /path/to/run-log-collector.sh
```

#### B. Windows Task Scheduler
```batch
@echo off
REM run-log-collector.bat
set SSH_HOST_1=server1.example.com
set SSH_HOST_2=server2.example.com
set SSH_HOST_3=server3.example.com
set SSH_USER=loguser
set SSH_KEY_PATH=C:\keys\logcollector.pem
cd C:\log-collector\client
node log-collection-skill.js
```

### 7. トラブルシューティング

#### A. 一般的な問題と解決策
```bash
# 問題1: "Module not found" エラー
解決策: npm install を実行して依存関係を再インストール

# 問題2: SSH接続エラー
解決策:
- SSH鍵のパーミッション確認 (chmod 600)
- サーバーへの到達可能性確認 (ping, telnet)
- SSH鍵の公開鍵がサーバーに正しく配置されているか確認

# 問題3: "Permission denied" ログアクセスエラー
解決策:
- SSH接続ユーザーにログファイルの読み取り権限があるか確認
- sudo権限が必要な場合は設定を調整

# 問題4: Excel/CSV出力エラー
解決策:
- 出力ディレクトリの書き込み権限確認
- ディスク容量の確認
```

#### B. デバッグ方法
```bash
# 詳細ログの有効化
DEBUG=* node log-collection-skill.js

# 段階的なテスト
1. SSH接続のみテスト
2. 単一サーバーでのログ検索テスト
3. 小さなExcelファイルでのテスト
4. 完全な実行テスト
```

### 8. セキュリティ考慮事項

#### A. SSH鍵管理
```bash
# 鍵の安全な保管
- 適切なファイルパーミッション (600)
- 定期的な鍵のローテーション
- パスフレーズ付き鍵の使用推奨

# 接続制限
- SSH接続元IPの制限
- 特定ユーザーのみアクセス許可
- sudo権限の最小化
```

#### B. ログアクセス制限
```bash
# 最小権限の原則
- ログファイルの読み取り専用アクセス
- 必要なディレクトリのみアクセス許可
- アクセスログの監視
```

## 🌐 実際の展開例

### 例1: 企業内サーバー環境
```yaml
環境:
  - サーバー数: 3台
  - OS: CentOS 7
  - SSH接続: ポート22（標準）
  - ログ収集ユーザー: logcollector
  - 実行頻度: 日次（午前2時）

設定:
  SSH_HOST_1: "prod-app-01.internal.company.com"
  SSH_HOST_2: "prod-app-02.internal.company.com"
  SSH_HOST_3: "prod-app-03.internal.company.com"
  SSH_PORT_*: 22
  SSH_USER: "logcollector"
  LOG_PATHS:
    - "/opt/app/logs/*.log"
    - "/var/log/application/*.log"
```

### 例2: AWS EC2環境
```yaml
環境:
  - EC2インスタンス: 3台
  - OS: Amazon Linux 2
  - SSH接続: セキュリティグループで制限
  - SSH鍵: EC2キーペア使用

設定:
  SSH_HOST_1: "ec2-xxx-xxx-xxx-xxx.compute-1.amazonaws.com"
  SSH_HOST_2: "ec2-yyy-yyy-yyy-yyy.compute-1.amazonaws.com"
  SSH_HOST_3: "ec2-zzz-zzz-zzz-zzz.compute-1.amazonaws.com"
  SSH_KEY_PATH: "/home/user/.ssh/ec2-keypair.pem"
  SSH_USER: "ec2-user"
```

### 例3: オンプレミス + クラウドハイブリッド
```yaml
環境:
  - サーバー1: オンプレミス（社内）
  - サーバー2-3: AWS EC2
  - VPN接続経由でアクセス

設定:
  SSH_HOST_1: "192.168.1.100"           # 社内サーバー
  SSH_HOST_2: "10.0.1.50"              # AWS VPC内
  SSH_HOST_3: "10.0.1.51"              # AWS VPC内
  SSH_PORT_1: 2222                     # 社内ファイアウォール設定
  SSH_PORT_2: 22                       # AWS標準
  SSH_PORT_3: 22                       # AWS標準
```

## 📝 動作保証チェックリスト

### ✅ デプロイメント前チェック
- [ ] Node.js (v12+) インストール済み
- [ ] 必要ファイルが正しくコピーされている
- [ ] npm install が正常完了
- [ ] 環境変数が正しく設定されている
- [ ] SSH鍵が適切な権限で配置されている
- [ ] 全サーバーへのSSH接続が成功する
- [ ] ログファイルへの読み取りアクセスが可能
- [ ] 入力フォルダにExcelファイルが存在
- [ ] 出力フォルダの書き込み権限がある

### ✅ 動作確認テスト
- [ ] ドライランモードで接続テスト成功
- [ ] サンプルExcelファイルでの処理成功
- [ ] 全サーバーからのログ収集成功
- [ ] Excel/CSV出力ファイル生成成功
- [ ] エラーハンドリングが適切に動作
- [ ] ログ出力が適切に記録される

## 🎯 まとめ

このLog Collector Toolは**完全に環境独立**で動作するよう設計されています：

1. **最小依存関係**: Node.js標準ライブラリ + 3つのnpmパッケージのみ
2. **設定の柔軟性**: すべて環境変数で制御可能
3. **プラットフォーム対応**: Windows, Linux, macOS で動作
4. **ネットワーク適応**: SSH接続可能な任意のサーバー構成に対応
5. **セキュリティ**: 標準的なSSH鍵認証のみ使用

**証明**: このツールは Docker コンテナ環境と全く同じコードで、実際の本番サーバー環境でも確実に動作します。環境固有の依存関係は一切ありません。