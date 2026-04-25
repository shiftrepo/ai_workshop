# ai_workshop

> AI利用促進共通リポジトリ — Claude Code・MCP・AIエージェントを活用した開発ワークショップの成果物と学習リソース

---

## 📁 リポジトリ構成

```
ai_workshop/
├── doc/                    # 環境構築・セットアップドキュメント
│   ├── img/                # スクリーンショット画像
│   ├── tec/                # 技術解説（Mermaid図・PNG）
│   └── anthropic/          # Anthropic関連資料
└── projects/               # 各プロジェクト
    ├── claude_startup/     # Claude Code 入門サンプル
    ├── excel_mcp_server/   # フォルダ比較ツール（3世代）
    ├── fee_matrix_engine/  # 料金算出マトリックスエンジン
    ├── library_system/     # 図書貸出管理システム（3世代）
    └── log_collector/      # ログ収集ツール
```

---

## 🚀 環境構築

初めて参加する方は以下の手順を **上から順番** に進めてください。

| 手順 | 内容 | 難易度 | ドキュメント |
|------|------|--------|------------|
| 0 | Git & TortoiseGit のインストール | ★☆☆ | [gitおよびTortoiseGitインストール.md](doc/gitおよびTortoiseGitインストール.md) |
| 1 | SSHキー作成と登録 | ★★☆ | [SSHキー作成と登録.md](doc/SSHキー作成と登録.md) |
| 2 | PAT（Personal Access Token）の作成 | ★★☆ | [patの作成.md](doc/patの作成.md) |
| 3 | 環境変数の設定 | ★☆☆ | [環境変数の設定.md](doc/環境変数の設定.md) |
| 4 | Node.js のインストール | ★☆☆ | [nodeのインストール.md](doc/nodeのインストール.md) |
| 5 | GitHub CLI のインストール | ★☆☆ | [GitHubCLIのインストール.md](doc/GitHubCLIのインストール.md) |
| 6 | Claude Code のインストールと設定 | ★★☆ | [ClaudeCodeのインストールと設定.md](doc/ClaudeCodeのインストールと設定.md) |
| 7 | リポジトリ作成と Claude Code でのアクセス | ★★☆ | [Githubにリポジトリを作成してClaudeCodeでアクセス.md](doc/Githubにリポジトリを作成してClaudeCodeでアクセス.md) |
| 8 | MCP サーバ導入 | ★★☆ | [mcpサーバ導入.md](doc/mcpサーバ導入.md) |
| 9 | GitHub MCP のグローバル設定 | ★★★ | [GitHubのMCPをグローバル設定に追加する方法.md](doc/GitHubのMCPをグローバル設定に追加する方法.md) |

---

## 📦 プロジェクト一覧

### 🟢 [claude_startup](projects/claude_startup/) — Claude Code 入門
Claude Code を使ってゼロからWebアプリを作るハンズオン入門。  
和ハーブストア（ECサイトプロトタイプ）を題材に、AIペアプログラミングの流れを体験する。

→ [詳細 README](projects/claude_startup/README.md)

---

### 🔵 [excel_mcp_server](projects/excel_mcp_server/) — フォルダ比較ツール（3世代）
2つのフォルダを比較し、差分をExcelレポートで出力するNode.jsツール。  
プロンプトエンジニアリングの試行錯誤の過程を3世代で記録している。

| バージョン | フォルダ | 概要 |
|-----------|---------|------|
| v1 基本実装 | [v1_basic](projects/excel_mcp_server/v1_basic/) | 初期実装。GitBash統合・色分けExcel出力 |
| v2 仕様書版 | [v2_spec](projects/excel_mcp_server/v2_spec/) | MCP仕様書に基づいた実装 |
| v3 Few-shot版 | [v3_few_shot](projects/excel_mcp_server/v3_few_shot/) | sdiff形式・サーバー/クライアント2段構成の最終版 |

→ [比較・全体解説 README](projects/excel_mcp_server/README.md)

---

### 🟡 [fee_matrix_engine](projects/fee_matrix_engine/) — 料金算出マトリックスエンジン
**1.77億通り**の条件組み合わせを **58ルール・約600行のPython** で処理する料金算出エンジン。  
テーブル駆動設計 × 段階パイプラインの設計パターンを実証するデモプロジェクト。

→ [詳細 README](projects/fee_matrix_engine/README.md)

---

### 🟣 [library_system](projects/library_system/) — 図書貸出管理システム（3世代）
社内図書の貸出・返却を管理するWebアプリ。  
Claude Code / Serena / SuperClaude の3種類のAIツールで実装した比較コレクション。

| バージョン | フォルダ | 使用ツール | 概要 |
|-----------|---------|----------|------|
| v1 基本実装 | [v1_basic](projects/library_system/v1_basic/) | Claude Code | Node.js + Vue.js の基本実装 |
| v2 Serena版 | [v2_with_serena](projects/library_system/v2_with_serena/) | Claude Code + Serena MCP | コードベース解析・セマンティック操作を活用 |
| v3 SuperClaude版 | [v3_with_superclaude](projects/library_system/v3_with_superclaude/) | SuperClaude | 詳細ドキュメント・CI/CD・テスト戦略まで完備 |

→ [比較・全体解説 README](projects/library_system/README.md)

---

### 🔴 [log_collector](projects/log_collector/) — ログ収集ツール
SSH経由で複数サーバーからログを自動収集するツール。  
オンプレミスLinux環境向けに設計されており、Excelタスク管理ファイルと連携する。

→ [詳細 README](projects/log_collector/README.md)

---

## 🔧 トラブルシューティング

- **環境変数設定後** → 新しいコマンドプロンプトを開くか、PCを再起動して反映させてください
- **GitHub認証エラー** → PATの有効期限と権限（`repo` スコープ）を確認してください
- **SSHキー関連エラー** → 鍵の登録状況（`~/.ssh/` と GitHub の設定）を確認してください
- **Claude Code 起動しない** → `ANTHROPIC_API_KEY` または AWS Bedrock の設定を確認してください

---

## 📚 技術資料

- [AIエージェントとMCPサーバの流れ](doc/tec/aiエージェントとMCPサーバの流れ.mermaid)
- [CLIツールシーケンス図](doc/tec/cli_tool_sequence.png)
- [Claude Code ブリーフィング](doc/claude_code_briefing.md)
- [Anthropic Sonnet 4.5 × AIエージェント解説](doc/anthropic/sonnset4.5&AIagents&contextengineering.md)
