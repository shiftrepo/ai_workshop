# 図書貸出システム（Library Management System）

社内向け図書貸出管理システムの完全なアーキテクチャ設計および実装仕様書。

## 概要

従業員が社内図書を借りて返却するまでのライフサイクルを管理するWebアプリケーション。シンプルで安全な認証機構と、直感的な操作画面を提供します。

**技術スタック**:
- フロントエンド: Vue.js 3 (Composition API)
- バックエンド: Node.js + Express.js
- データベース: SQLite 3
- 認証: Cookie-based Session

---

## ドキュメント構成

### 📐 [ARCHITECTURE.md](./ARCHITECTURE.md)
システム全体のアーキテクチャ設計書

**内容**:
- 3層構造のシステム設計図
- ディレクトリ構成の詳細
- コンポーネント設計（フロントエンド/バックエンド）
- データフロー図（ログイン、貸出、返却）
- 非機能要件（パフォーマンス、可用性、保守性）
- デプロイメント構成
- 技術選定理由
- リスク分析と今後の拡張性

**対象読者**: プロジェクトマネージャー、アーキテクト、新規参加開発者

---

### 🗄️ [DATABASE.md](./DATABASE.md)
データベース設計書

**内容**:
- ER図（Entity Relationship Diagram）
- テーブル定義（users, books, loans）
- インデックス設計
- ビジネスルール実装（貸出制限、在庫管理）
- SQLクエリ例（検索、集計、統計）
- パフォーマンス最適化
- バックアップ/リストア戦略
- マイグレーション管理

**対象読者**: データベースエンジニア、バックエンド開発者

---

### 🔌 [API.md](./API.md)
REST API仕様書

**内容**:
- APIエンドポイント一覧
- リクエスト/レスポンス形式
- 認証API（登録、ログイン、ログアウト）
- ユーザ管理API
- 書籍管理API
- 貸出管理API
- エラーコード一覧
- テスト用cURLコマンド例
- レート制限とセキュリティ設定

**対象読者**: バックエンド開発者、フロントエンド開発者、QAエンジニア

---

### 🔒 [SECURITY.md](./SECURITY.md)
セキュリティ設計書

**内容**:
- 認証・セッション管理アーキテクチャ
- Cookie-based Session詳細設定
- パスワードセキュリティ（bcrypt）
- 主要な脅威と対策
  - SQLインジェクション
  - XSS（クロスサイトスクリプティング）
  - CSRF（クロスサイトリクエストフォージェリ）
  - 認証総当たり攻撃
  - セッション固定攻撃
  - セッションハイジャック
- 入力検証とサニタイゼーション
- ロギングと監査
- セキュリティヘッダー設定
- 環境変数管理
- セキュリティチェックリスト

**対象読者**: セキュリティエンジニア、全開発者、インフラエンジニア

---

### 🛠️ [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md)
**NEW** バックエンド完全実装ガイド

**内容**:
- プロジェクトセットアップから本番デプロイまでの完全手順
- データベース層実装（SQLite接続、マイグレーション、Seed）
- 認証システム実装（パスワードハッシュ化、セッション管理）
- ミドルウェア実装（認証、バリデーション、レート制限、エラーハンドリング）
- Repositoryパターン実装（データアクセス層）
- Service層実装（ビジネスロジック）
- Controller層実装（リクエスト/レスポンス処理）
- ルーティング設定（全エンドポイント）
- テスト実装（Jest単体テスト、APIテスト）
- 本番環境デプロイ（PM2、Nginx設定）
- トラブルシューティング

**対象読者**: バックエンド開発者、新規参加開発者

**実装時間**: 約8-12時間（初回実装）

---

### 🖥️ [FRONTEND.md](./FRONTEND.md)
フロントエンド完全実装ガイド

**内容**:
- Vue 3 + TypeScript + Composition API
- 状態管理（Pinia）
- ルーティング設計（Vue Router）
- コンポーネント設計（共通/ページ別）
- API通信（Axios）
- フォームバリデーション（VeeValidate）
- UI/UXデザイン（Bootstrap 5）
- レスポンシブ対応
- アクセシビリティ対応

**対象読者**: フロントエンド開発者

---

### ⚡ [QUICK_START.md](./QUICK_START.md)
クイックスタートガイド

**内容**:
- バックエンド5分セットアップ
- フロントエンド5分セットアップ
- 実装の優先順位とタイムライン
- よくある問題と解決法
- デバッグツール紹介

**対象読者**: 今すぐ開発を始めたい全員

---

## 主要機能

### ユーザ機能
- ✅ ユーザ登録・ログイン
- 📚 書籍検索・一覧表示
- 📖 書籍詳細確認
- 🔖 書籍の貸出（最大3冊、2週間）
- 🔄 書籍の返却
- 📊 自分の貸出状況確認

### 管理者機能
- 👥 ユーザ管理（一覧、詳細、削除）
- 📕 書籍登録・更新・削除
- 📈 システム統計表示
- ⚠️ 延滞書籍一覧
- 📋 貸出履歴確認

---

## ビジネスルール

### 貸出制限
- 1人あたり最大3冊まで同時貸出可能
- 貸出期間: 2週間（14日）
- 期限超過で自動的に「延滞」ステータスに更新

### 書籍在庫
- 同一タイトル（ISBN）最大3冊まで登録可能
- 在庫管理: 総在庫数（total_stock）と貸出可能在庫（available_stock）

### 権限
- **一般ユーザ**: 書籍検索、貸出、返却、自分の情報閲覧
- **管理者**: 全ユーザ機能 + ユーザ管理、書籍管理、統計閲覧

---

## 技術仕様概要

### データベーススキーマ

**usersテーブル**:
```sql
id, username, password_hash, email, role, created_at, updated_at
```

**booksテーブル**:
```sql
id, isbn, title, author, publisher, published_year, category,
total_stock, available_stock, created_at, updated_at
```

**loansテーブル**:
```sql
id, user_id, book_id, loan_date, due_date, return_date, status, created_at
```

### APIエンドポイント例

```
POST   /api/auth/register       # ユーザ登録
POST   /api/auth/login          # ログイン
POST   /api/auth/logout         # ログアウト

GET    /api/books               # 書籍一覧
GET    /api/books/:id           # 書籍詳細
POST   /api/books               # 書籍登録（管理者）
PUT    /api/books/:id           # 書籍更新（管理者）
DELETE /api/books/:id           # 書籍削除（管理者）

POST   /api/loans               # 書籍を借りる
GET    /api/loans/my-loans      # 自分の貸出状況
PUT    /api/loans/:id/return    # 書籍を返却する
GET    /api/loans/overdue       # 延滞一覧（管理者）

GET    /api/users               # ユーザ一覧（管理者）
GET    /api/users/:id           # ユーザ詳細
PUT    /api/users/:id           # ユーザ情報更新
DELETE /api/users/:id           # ユーザ削除（管理者）
```

---

## セットアップ手順（概要）

### 前提条件
- Node.js 18以上
- npm 9以上
- SQLite 3

### インストール

```bash
# リポジトリクローン
git clone <repository-url>
cd library_system_with_superclaude

# バックエンドセットアップ
cd server
npm install
cp .env.example .env
# .envファイルを編集（SESSION_SECRECTを変更）
npm run init-db     # データベース初期化
npm run dev         # 開発サーバ起動（ポート3000）

# フロントエンドセットアップ（別ターミナル）
cd ../client
npm install
npm run dev         # 開発サーバ起動（ポート5173）
```

### アクセス
- フロントエンド: http://localhost:5173
- API: http://localhost:3000/api

### 初期アカウント
- **管理者**: username: `admin`, password: `admin123`（本番では変更必須）

---

## 開発フロー

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能追加
- `bugfix/*`: バグ修正

### コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
refactor: リファクタリング
test: テスト追加
chore: ビルド・設定変更
```

### テスト

```bash
# バックエンドテスト
cd server
npm test              # 全テスト実行
npm run test:unit     # 単体テスト
npm run test:api      # APIテスト

# フロントエンドテスト
cd client
npm test              # コンポーネントテスト
```

---

## トラブルシューティング

### セッションエラー
**症状**: ログイン後すぐにログアウトされる
**原因**: SESSION_SECRET未設定または不正
**解決**: `.env`ファイルで`SESSION_SECRET`を適切に設定

### データベースロック
**症状**: `database is locked`エラー
**原因**: 複数の書き込みトランザクション同時実行
**解決**: WALモード有効化（`PRAGMA journal_mode = WAL`）

### CORS エラー
**症状**: フロントエンドからAPIアクセス失敗
**原因**: CORSオリジン設定不正
**解決**: `server/src/app.js`でCORS設定を確認

---

## パフォーマンス目標

- API応答時間: 95%tile < 500ms
- 画面遷移: < 1秒
- 同時接続: 50ユーザまで対応

---

## ライセンス

社内利用限定（Private）

---

## 問い合わせ

プロジェクトに関する質問や問題は、社内Slackチャンネル `#library-system` へ。

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Software Architect Agent
