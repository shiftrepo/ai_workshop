# ログ収集ツール - 本番環境用クライアント

このディレクトリには、Windows環境向けの本番環境対応ログ収集システムが含まれています。

## 📁 ディレクトリ構成

```
client/
├── log-collection-skill.js    # メインログ収集スクリプト
├── log-collection-csv.js       # CSV出力版
├── package.json                # Node.js依存関係のみ
├── examples/
│   ├── log-patterns.json       # ログ解析パターン（必須）
│   └── task_management_sample.xlsx  # サンプルタスクファイル
├── output/                     # 生成されたレポート（自動作成）
└── README.md                   # このファイル
```

## 🚀 セットアップ（Windows環境）

### 1. Node.jsのインストール
https://nodejs.org/ からNode.jsをダウンロードしてインストール（LTS版推奨）

### 2. 依存関係のインストール
```cmd
cd client
npm install
```

### 3. SSHアクセスの準備
- サーバー管理者からSSH秘密鍵ファイルを取得
- 注意：ユーザー名、サーバーホスト名/IP、ポート番号をメモ

### 4. タスク管理ファイルの準備
- `client/examples/` ディレクトリにExcelタスクファイルを配置
- ファイルには「情報収集中」ステータスのタスクが含まれている必要があります

## 📊 使用方法（Windows）

### 基本的な実行
```cmd
rem 必要な環境変数を設定
set SSH_KEY_PATH=C:\path\to\your\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector

rem ログ収集を実行
npm run log-collect
```

### 複数サーバー
```cmd
set SSH_KEY_PATH=C:\path\to\your\private_key
set SSH_USER=logcollector

rem サーバー1
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22

rem サーバー2
set SSH_HOST_2=192.168.1.101
set SSH_PORT_2=22

rem サーバー3
set SSH_HOST_3=192.168.1.102
set SSH_PORT_3=22

npm run log-collect
```

### カスタム入出力ディレクトリ
```cmd
set SSH_KEY_PATH=C:\path\to\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector
set INPUT_FOLDER=C:\tasks
set OUTPUT_FOLDER=C:\results

npm run log-collect
```

## 🔧 設定

### 必須環境変数
| 変数 | 説明 | 例 |
|------|------|-----|
| `SSH_KEY_PATH` | SSH秘密鍵のパス | `C:\keys\id_rsa` |
| `SSH_HOST_1` | サーバー1のホスト名/IP | `192.168.1.100` |
| `SSH_PORT_1` | サーバー1のSSHポート | `22` |
| `SSH_USER` | SSHユーザー名 | `logcollector` |

### オプション環境変数
| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `INPUT_FOLDER` | タスクファイルのディレクトリ | `./examples` |
| `OUTPUT_FOLDER` | レポート出力ディレクトリ | `./output` |
| `LOG_PATTERN_FILE` | ログパターン設定 | `./examples/log-patterns.json` |
| `SSH_HOST_2` | サーバー2のホスト名/IP | （未設定） |
| `SSH_PORT_2` | サーバー2のSSHポート | （未設定） |
| `SSH_HOST_3` | サーバー3のホスト名/IP | （未設定） |
| `SSH_PORT_3` | サーバー3のSSHポート | （未設定） |

## 📝 出力ファイル

システムは `output/` ディレクトリに2種類のレポートを生成します：

1. **Excelレポート** (`log-collection-result_YYYY-MM-DD_HH-MM-SS.xlsx`)
   - タスク概要を含むサマリーシート
   - フォーマットされた詳細ログエントリ
   - フィルター可能な列

2. **CSVレポート** (`log-collection-result_YYYY-MM-DD_HH-MM-SS.csv`)
   - プレーンテキスト形式
   - 他のツールへのインポートが容易
   - 1行に1つのログエントリ

## ❗ トラブルシューティング

### SSH接続失敗
1. SSH_KEY_PATHが正しく、ファイルが存在することを確認
2. SSHを手動でテスト: `ssh -i <key> -p <port> <user>@<host>`
3. サーバーへのネットワーク接続を確認
4. 管理者にSSH認証情報を確認

### タスクが見つからない
1. INPUT_FOLDERにExcelファイルが含まれていることを確認
2. タスクが「情報収集中」ステータスであることを確認
3. Excelファイルが破損していないことを確認

### ログが見つからない
1. タスク説明にTrackIDがあることを確認
2. log-patterns.json設定を確認
3. サーバーにログファイルが存在することを確認
4. 設定のログファイルパスを確認

## 🔒 セキュリティ注意事項

- **SSH秘密鍵をコミットしない** バージョン管理に含めないこと
- 制限された権限を持つ安全な場所にキーを保存
- セキュリティポリシーに従って定期的にキーをローテーション
- キーファイルに強力なパスワード/パスフレーズを使用

## 📞 サポート

本番環境デプロイメントのサポートについては、システム管理者にお問い合わせください。

## 🧪 開発環境

開発とテストのリソースは `../dev-environment/` にあります：
- ローカルテスト用Dockerコンテナ
- サンプルSSHキー（開発専用）
- テストスクリプトとユーティリティ

**注意**: dev-environmentはWindows本番環境デプロイメントには不要です。
