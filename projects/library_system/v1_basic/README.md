# 図書貸出管理システム

社内図書の貸出・返却を管理するWebアプリケーションです。

## 機能概要

### 一般ユーザー
- ユーザー登録・ログイン
- 書籍一覧の閲覧・検索
- 書籍の貸出（最大3冊、期間2週間）
- 書籍の返却
- 自分の貸出状況確認

### 管理者
- 書籍の登録・削除
- 全貸出記録の閲覧
- 期限切れ貸出の確認

## 技術スタック

### バックエンド
- **Node.js** - サーバーサイドランタイム
- **Express.js** - Webフレームワーク
- **SQLite3** - データベース
- **bcrypt** - パスワードハッシュ化
- **express-session** - セッション管理

### フロントエンド
- **Vue.js 3** - UIフレームワーク
- **Vue Router** - ルーティング
- **Axios** - HTTP通信
- **Vite** - ビルドツール

## セットアップ手順

### 前提条件
- Node.js (v16以上)
- npm または yarn

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd library_system
```

### 2. バックエンドのセットアップ
```bash
cd backend

# 依存関係のインストール
npm install

# データベースの初期化（テーブル作成 + サンプルデータ投入）
npm run init-db

# サーバー起動
npm start

# または開発モード（ファイル変更時に自動再起動）
npm run dev
```

バックエンドは `http://localhost:3000` で起動します。

### 3. フロントエンドのセットアップ

新しいターミナルを開いて：

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

### 4. アプリケーションへのアクセス

ブラウザで `http://localhost:5173` にアクセスしてください。

## デモアカウント

### 管理者アカウント
- **ユーザーID**: `admin`
- **パスワード**: `admin123`

### 一般ユーザーアカウント
- **ユーザーID**: `tanaka` / `sato` / `suzuki` / `yamada`
- **パスワード**: `user123`

## プロジェクト構成

```
library_system/
├── backend/                 # バックエンド (Node.js + Express)
│   ├── src/
│   │   ├── config/         # DB設定、初期化スクリプト
│   │   ├── models/         # データモデル (User, Book, Loan)
│   │   ├── controllers/    # ビジネスロジック
│   │   ├── routes/         # APIルート
│   │   ├── middleware/     # 認証・エラーハンドリング
│   │   └── app.js          # Expressアプリ
│   ├── database/
│   │   ├── schema.sql      # テーブル定義
│   │   ├── seed.sql        # 初期データ
│   │   └── library.db      # SQLiteデータベース (自動生成)
│   └── package.json
│
├── frontend/               # フロントエンド (Vue.js)
│   ├── src/
│   │   ├── components/    # 再利用可能なコンポーネント
│   │   ├── views/         # ページコンポーネント
│   │   ├── services/      # API通信サービス
│   │   ├── router/        # ルーティング設定
│   │   ├── App.vue        # ルートコンポーネント
│   │   └── main.js        # エントリーポイント
│   └── package.json
│
├── API.md                  # API仕様書
└── README.md              # このファイル
```

## API エンドポイント

詳細は [API.md](./API.md) を参照してください。

### 認証
- `POST /api/register` - ユーザー登録
- `POST /api/login` - ログイン
- `POST /api/logout` - ログアウト
- `GET /api/me` - 現在のユーザー情報取得

### 書籍
- `GET /api/books` - 書籍一覧取得
- `GET /api/books/available` - 利用可能な書籍一覧
- `GET /api/books/:bookId` - 書籍詳細
- `POST /api/book/add` - 書籍登録（管理者）
- `DELETE /api/books/:bookId` - 書籍削除（管理者）

### 貸出・返却
- `POST /api/borrow` - 貸出
- `POST /api/return` - 返却
- `GET /api/loans` - 全貸出記録（管理者）
- `GET /api/loans/overdue` - 期限切れ一覧（管理者）

### 状況確認
- `GET /api/status/my` - 自分の貸出状況
- `GET /api/status/user/:userId` - ユーザーの貸出状況
- `GET /api/status/book/:bookId` - 書籍の貸出状況

## 環境変数

### バックエンド (.env)
```
PORT=3000
SESSION_SECRET=your-secret-key
DB_PATH=./database/library.db
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## トラブルシューティング

### データベースをリセットしたい
```bash
cd backend
rm database/library.db
npm run init-db
```

### ポートが既に使用されている
- バックエンド: `.env` の `PORT` を変更
- フロントエンド: `vite.config.js` の `server.port` を変更

### CORS エラー
- バックエンドの `.env` で `CORS_ORIGIN` がフロントエンドのURLと一致しているか確認

## 開発者向け情報

### テストの実行
```bash
cd backend
npm test
```

### プロダクションビルド
```bash
# フロントエンド
cd frontend
npm run build

# ビルド結果は dist/ ディレクトリに生成されます
```

## ライセンス

MIT

## 貢献

Issue や Pull Request を歓迎します。

## お問い合わせ

質問や問題がある場合は、Issue を作成してください。
