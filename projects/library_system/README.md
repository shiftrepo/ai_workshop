# Library System — 図書貸出管理システム（3世代）

社内図書の貸出・返却を管理するWebアプリケーション。  
同じ仕様を **Claude Code / Serena / SuperClaude** の3種類のAIツールで実装した比較コレクションです。

---

## 🤖 AIツール別の実装比較

```
v1_basic              v2_with_serena          v3_with_superclaude
（Claude Code単体）  ──→  （+ Serena MCP）  ──→  （SuperClaude）
基本的な実装             コードベース解析           詳細ドキュメント
JS + SQLite              セマンティック操作          CI/CD・テスト戦略
                         でコード把握               まで完備
```

---

## 📦 バージョン比較

| 観点 | [v1_basic](v1_basic/) | [v2_with_serena](v2_with_serena/) | [v3_with_superclaude](v3_with_superclaude/) |
|------|----------------------|----------------------------------|---------------------------------------------|
| **使用AIツール** | Claude Code | Claude Code + Serena MCP | SuperClaude |
| **フロントエンド** | JavaScript（バニラ） | JavaScript（バニラ） | Vue.js 3（Composition API） |
| **バックエンド** | Node.js + Express | Node.js + Express | Node.js + Express（レイヤード設計） |
| **データベース** | SQLite | SQLite | SQLite（最適化スキーマ） |
| **認証** | セッション管理 | セッション管理 | bcrypt + HTTPOnly Cookie |
| **テスト** | 基本的 | 基本的 | Jest（ユニット + 統合テスト） |
| **ドキュメント** | README | README | README + CI/CD + テスト戦略 |
| **特徴** | シンプルで動く | AIのコード理解力を活用 | エンタープライズ品質 |

---

## 🚀 各バージョンの起動方法

### v1_basic / v2_with_serena

```bash
cd v1_basic   # または v2_with_serena
npm install
node server.js
# → http://localhost:3000
```

### v3_with_superclaude（フル機能版）

```bash
# バックエンド起動
cd v3_with_superclaude/server
npm install
cp .env.example .env   # SESSION_SECRET を変更すること
npm run init-db        # DBの初期化（スキーマ + シードデータ）
npm run dev            # → http://localhost:3000

# フロントエンド起動（別ターミナル）
cd v3_with_superclaude/client
npm install
npm run dev            # → http://localhost:5173
```

---

## 📋 共通仕様

| 機能 | 内容 |
|------|------|
| 同時貸出上限 | 1人につき最大3冊 |
| 貸出期間 | 2週間（14日） |
| ユーザーロール | 一般ユーザー / 管理者 |
| 在庫管理 | 貸出/返却時に自動更新 |

---

## 📖 関連ドキュメント

- [Serena MCP セットアップ](v2_with_serena/MCP_SETUP.md)
- [MCP サーバー導入](../../doc/mcpサーバ導入.md)
- [リポジトリ全体の README に戻る](../../README.md)
