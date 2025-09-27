# ai_workshop
AI利用促進共通リポジトリ

# セットアップ手順

## Git & TortoiseGit のインストール

バージョン管理システムGitとそのGUIクライアントTortoiseGitのインストール手順は、以下のドキュメントを参照してください。
[Git & TortoiseGit インストール手順書](doc/gitおよびTortoiseGitインストール.md)

## 環境構築の全体像

以下の表は、環境構築の全体像を示しています。上から順番に進めていくことをお勧めします。
各手順の詳細は、それぞれのリンク先のドキュメントを参照してください。

| 手順 | 内容 | 目的 | 難易度 | 詳細ドキュメント |
|------|------|------|--------|----------------|
| 0. Git & TortoiseGitのインストール | バージョン管理システムGitとGUIクライアントの設定 | バージョン管理環境の構築 | ★☆☆ | [gitおよびTortoiseGitインストール.md](doc/gitおよびTortoiseGitインストール.md) |
| 1. SSHキー作成と登録 | GitHubに安全に接続するためのSSHキーを作成・登録 | GitHubとの安全な通信の確立 | ★★☆ | [SSHキー作成と登録.md](doc/SSHキー作成と登録.md) |
| 2. PAT(Personal Access Token)の作成 | GitHub APIにアクセスするためのトークン作成 | GitHubとの連携とAPIアクセス | ★★☆ | [patの作成.md](doc/patの作成.md) |
| 3. 環境変数の設定 | システムに必要な環境変数を設定 | 各種ツールの連携設定 | ★☆☆ | [環境変数の設定.md](doc/環境変数の設定.md) |
| 4. Node.jsのインストール | Node.js実行環境の設定 | JavaScript実行環境の構築 | ★☆☆ | [nodeのインストール.md](doc/nodeのインストール.md) |
| 5. GitHub CLIのインストール | コマンドラインからGitHubを操作するツール | GitHubの操作効率化 | ★☆☆ | [GitHubCLIのインストール.md](doc/GitHubCLIのインストール.md) |
| 6. Claude Codeのインストールと設定 | AIアシスタントツールの設定 | コーディング支援AIの導入 | ★★☆ | [ClaudeCodeのインストールと設定.md](doc/ClaudeCodeのインストールと設定.md) |
| 7. リポジトリ作成とClaudeでのアクセス | GitHubリポジトリ作成とアクセス確認 | 実際の開発環境準備 | ★★☆ | [Githubにリポジトリを作成してClaudeCodeでアクセス.md](doc/Githubにリポジトリを作成してClaudeCodeでアクセス.md) |
| 8. MCPサーバ導入 | mcpサーバ導入 | 実際の開発環境準備 | ★★☆ | [mcpサーバ導入.md](doc/mcpサーバ導入.md) |

## 手順概要

各設定の詳細については、それぞれのリンク先ドキュメントを参照してください。ここでは、各手順の概要のみを説明します。

### 0. Git & TortoiseGitのインストール

バージョン管理システムGitとそのGUIクライアントTortoiseGitをインストールします。
詳細な手順は [gitおよびTortoiseGitインストール.md](doc/gitおよびTortoiseGitインストール.md) を参照してください。

### 1. SSHキーの作成とGitHubに公開鍵を登録

GitHubにSSHで安全に接続するためのキーペアを生成し設定します。
詳細な手順は [SSHキー作成と登録.md](doc/SSHキー作成と登録.md) を参照してください。

### 2. Personal Access Token (PAT) の作成

GitHubのAPIにアクセスするためのトークンを作成します。
詳細な手順は [patの作成.md](doc/patの作成.md) を参照してください。

### 3. 環境変数の設定

必要な環境変数を設定します。
詳細な手順は [環境変数の設定.md](doc/環境変数の設定.md) を参照してください。

### 4. Node.jsのインストール

Node.jsの実行環境をセットアップします。
詳細な手順は [nodeのインストール.md](doc/nodeのインストール.md) を参照してください。

### 5. GitHub CLIのインストール

コマンドラインからGitHubを操作するためのツールをインストールします。
詳細な手順は [GitHubCLIのインストール.md](doc/GitHubCLIのインストール.md) を参照してください。

### 6. Claude Codeのインストールと設定

AI支援ツールのClaude Codeをセットアップします。
詳細な手順は [ClaudeCodeのインストールと設定.md](doc/ClaudeCodeのインストールと設定.md) を参照してください。

### 7. Githubにリポジトリを作成してClaude Codeでアクセス

リポジトリを作成し、Claude Codeからのアクセスを確認します。
詳細な手順は [Githubにリポジトリを作成してClaudeCodeでアクセス.md](doc/Githubにリポジトリを作成してClaudeCodeでアクセス.md) を参照してください。

## トラブルシューティング

* 環境変数設定後は、新しいコマンドプロンプトウィンドウを開くか、PCを再起動して反映させてください。
* GitHub認証エラーが発生した場合はPATの有効期限と権限を確認してください。
* SSHキー関連のエラーが発生した場合は鍵の登録状況を確認してください。

以上で環境構築は完了です。お疲れ様でした！
