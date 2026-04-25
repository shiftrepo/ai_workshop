# ClaudeStartUp — Claude Code 入門サンプル

Claude Code を使ってゼロからWebアプリを作るハンズオン入門プロジェクトです。  
「和ハーブストア」（ECサイトプロトタイプ）を題材に、AIペアプログラミングの流れを体験します。

---

## 📦 プロジェクト構成

```
claude_startup/
├── README.md           # このファイル
├── CLAUDE.md           # Claude Code 向け説明ファイル
└── herb-ec-site/       # 和ハーブストア ECサイトプロトタイプ
    ├── app.js
    ├── package.json
    ├── public/         # 静的ファイル（CSS・JS）
    ├── routes/         # ルーティング
    ├── scripts/        # 起動・停止スクリプト
    └── views/          # EJSテンプレート
```

---

## 🌿 herb-ec-site — 和ハーブストア

日本人向けのハーブを販売するECサイトのプロトタイプです。  
Node.js を使用し、ローカル環境でトップページを確認できるシンプルな実装です。

### セットアップ

```bash
cd herb-ec-site
npm install
```

### 起動・停止

```bash
# サーバー起動（バックグラウンド）
npm start
# → http://localhost:3000 でアクセス

# サーバー停止
npm run stop

# 開発モード（ファイル変更時に自動再起動）
npm run dev
```

### 技術スタック

- **Node.js** — サーバーサイドランタイム
- **Express.js** — Webフレームワーク
- **EJS** — テンプレートエンジン

---

## 📖 関連ドキュメント

- [Claude Code のインストールと設定](../../doc/ClaudeCodeのインストールと設定.md)
- [GitHub にリポジトリを作成して Claude Code でアクセス](../../doc/Githubにリポジトリを作成してClaudeCodeでアクセス.md)
- [リポジトリ全体の README に戻る](../../README.md)
