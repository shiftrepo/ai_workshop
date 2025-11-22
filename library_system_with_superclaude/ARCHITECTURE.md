# 図書貸出システム アーキテクチャ設計書

## 1. システム概要

### 1.1 目的
社内向け図書貸出管理システム。従業員が図書を借りて返却するまでのライフサイクルを管理する。

### 1.2 技術スタック
- **フロントエンド**: Vue.js 3 (Composition API)
- **バックエンド**: Node.js + Express.js
- **データベース**: SQLite 3
- **認証**: Cookie-based Session (express-session)
- **パッケージ管理**: npm

### 1.3 システム特性
- 社内利用限定（インターネット公開なし）
- 同時利用者: 最大50名程度
- データ規模: 書籍1000冊、貸出履歴10000件程度
- 可用性要件: 業務時間内99%稼働

---

## 2. システムアーキテクチャ（3層構造）

```
┌─────────────────────────────────────────────────────────────┐
│                   Presentation Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Vue.js SPA (Port: 5173)                    │   │
│  │  - ログイン画面                                        │   │
│  │  - ユーザ登録画面                                      │   │
│  │  - 書籍一覧/検索画面                                   │   │
│  │  - 貸出/返却操作画面                                   │   │
│  │  - 管理画面（書籍登録・ユーザ管理）                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     Node.js + Express.js API Server (Port: 3000)    │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │  Controllers  │  │  Middleware  │                │   │
│  │  │  - Auth       │  │  - Auth      │                │   │
│  │  │  - User       │  │  - Error     │                │   │
│  │  │  - Book       │  │  - Validator │                │   │
│  │  │  - Loan       │  │  - CORS      │                │   │
│  │  └──────────────┘  └──────────────┘                │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │   Services    │  │   Utils      │                │   │
│  │  │  - Business   │  │  - Password  │                │   │
│  │  │    Logic      │  │  - Logger    │                │   │
│  │  └──────────────┘  └──────────────┘                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SQLite Database                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │  users   │ │  books   │ │  loans   │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────┐           │   │
│  │  │        Data Access Layer             │           │   │
│  │  │  - Repository Pattern                │           │   │
│  │  │  - Query Builders                    │           │   │
│  │  └──────────────────────────────────────┘           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. ディレクトリ構成

```
library_system_with_superclaude/
├── client/                      # フロントエンド（Vue.js）
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/              # 静的リソース
│   │   ├── components/          # 共通コンポーネント
│   │   │   ├── Header.vue
│   │   │   ├── Footer.vue
│   │   │   └── BookCard.vue
│   │   ├── views/               # ページコンポーネント
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   ├── BookList.vue
│   │   │   ├── MyLoans.vue
│   │   │   └── Admin/
│   │   │       ├── BookManagement.vue
│   │   │       └── UserManagement.vue
│   │   ├── router/              # Vue Router設定
│   │   │   └── index.js
│   │   ├── store/               # 状態管理（Pinia）
│   │   │   ├── auth.js
│   │   │   ├── books.js
│   │   │   └── loans.js
│   │   ├── services/            # API通信
│   │   │   ├── api.js           # Axios設定
│   │   │   ├── authService.js
│   │   │   ├── bookService.js
│   │   │   └── loanService.js
│   │   ├── utils/               # ユーティリティ
│   │   │   └── validators.js
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # バックエンド（Node.js）
│   ├── src/
│   │   ├── config/              # 設定
│   │   │   ├── database.js      # SQLite接続設定
│   │   │   ├── session.js       # セッション設定
│   │   │   └── constants.js     # 定数定義
│   │   ├── middleware/          # ミドルウェア
│   │   │   ├── auth.js          # 認証ミドルウェア
│   │   │   ├── errorHandler.js  # エラーハンドリング
│   │   │   ├── validator.js     # リクエスト検証
│   │   │   └── adminGuard.js    # 管理者権限チェック
│   │   ├── controllers/         # コントローラー
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── bookController.js
│   │   │   └── loanController.js
│   │   ├── services/            # ビジネスロジック
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── bookService.js
│   │   │   └── loanService.js
│   │   ├── repositories/        # データアクセス層
│   │   │   ├── userRepository.js
│   │   │   ├── bookRepository.js
│   │   │   └── loanRepository.js
│   │   ├── models/              # データモデル定義
│   │   │   ├── User.js
│   │   │   ├── Book.js
│   │   │   └── Loan.js
│   │   ├── routes/              # ルーティング
│   │   │   ├── index.js
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── bookRoutes.js
│   │   │   └── loanRoutes.js
│   │   ├── utils/               # ユーティリティ
│   │   │   ├── passwordHash.js  # パスワードハッシュ化
│   │   │   ├── logger.js        # ロギング
│   │   │   └── dateUtils.js     # 日付操作
│   │   ├── db/                  # データベース
│   │   │   ├── schema.sql       # テーブル定義
│   │   │   ├── seed.sql         # 初期データ
│   │   │   └── migrations/      # マイグレーション
│   │   ├── app.js               # Expressアプリケーション
│   │   └── server.js            # サーバー起動
│   ├── tests/                   # テスト
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── .env.example
│
├── docs/                        # ドキュメント
│   ├── ARCHITECTURE.md          # 本ファイル
│   ├── API.md                   # API仕様書
│   ├── DATABASE.md              # DB設計書
│   └── SETUP.md                 # セットアップ手順
│
├── scripts/                     # スクリプト
│   ├── setup.sh                 # 初期セットアップ
│   └── backup.sh                # バックアップ
│
├── .gitignore
└── README.md
```

---

## 4. コンポーネント設計

### 4.1 フロントエンド（Vue.js）

**主要コンポーネント**:
- **認証**: Login.vue, Register.vue
- **書籍**: BookList.vue, BookCard.vue, BookDetail.vue
- **貸出**: MyLoans.vue, LoanHistory.vue
- **管理**: BookManagement.vue, UserManagement.vue

**状態管理（Pinia）**:
- **authStore**: ログイン状態、ユーザ情報
- **bookStore**: 書籍一覧、検索結果
- **loanStore**: 貸出情報、返却期限

**ルーティング**:
```javascript
/login              → ログイン画面
/register           → ユーザ登録
/books              → 書籍一覧
/books/:id          → 書籍詳細
/my-loans           → 自分の貸出状況
/admin/books        → 書籍管理（管理者のみ）
/admin/users        → ユーザ管理（管理者のみ）
```

### 4.2 バックエンド（Node.js + Express）

**レイヤー構成**:
1. **Routes**: URLとコントローラーのマッピング
2. **Controllers**: リクエスト/レスポンス処理、バリデーション
3. **Services**: ビジネスロジック実装
4. **Repositories**: データベースアクセス

**主要サービス**:
- **authService**: ログイン、ログアウト、セッション管理
- **userService**: ユーザ登録、情報更新、削除
- **bookService**: 書籍登録、検索、更新、削除
- **loanService**: 貸出処理、返却処理、期限チェック

---

## 5. データフロー

### 5.1 ログインフロー
```
1. ユーザがログイン情報入力（Vue.js）
2. POST /api/auth/login → authController
3. authService.login() → userRepository.findByUsername()
4. パスワードハッシュ検証
5. セッション生成（express-session）
6. Cookie設定 → クライアントへ返却
7. フロントエンドでログイン状態保持（Pinia）
```

### 5.2 貸出フロー
```
1. ユーザが書籍選択 → 「借りる」ボタン
2. POST /api/loans → loanController
3. 認証ミドルウェアでセッション検証
4. loanService.createLoan()
   - 貸出上限チェック（3冊以内）
   - 書籍在庫チェック
5. loanRepository.create()
6. bookRepository.updateStock()（在庫-1）
7. トランザクション完了 → 成功レスポンス
8. フロントエンドで貸出情報更新
```

### 5.3 返却フロー
```
1. ユーザが「返却する」ボタンクリック
2. PUT /api/loans/:id/return → loanController
3. loanService.returnLoan()
   - 貸出記録検証
   - 返却日設定
4. loanRepository.update()
5. bookRepository.updateStock()（在庫+1）
6. 成功レスポンス → フロントエンド更新
```

---

## 6. 非機能要件

### 6.1 パフォーマンス
- **API応答時間**: 95%tile < 500ms
- **画面遷移**: < 1秒
- **同時接続**: 50ユーザまで対応
- **データベースインデックス**: username, isbn, loan_dateに設定

### 6.2 セキュリティ
- **パスワード**: bcryptでハッシュ化（salt rounds: 10）
- **セッション**: HTTPOnly Cookie、Secure属性（本番環境）
- **SQL injection対策**: Prepared Statements使用
- **XSS対策**: Vue.jsの自動エスケープ機能
- **CSRF対策**: セッショントークン検証
- **入力検証**: すべてのAPIエンドポイントで実施

### 6.3 可用性
- **エラーハンドリング**: すべてのAPIで統一されたエラーレスポンス
- **ロギング**: Winston使用（ファイル + コンソール出力）
- **バックアップ**: 日次SQLiteファイルバックアップ
- **復旧手順**: データベースファイル復元手順文書化

### 6.4 保守性
- **コード規約**: ESLint + Prettier
- **コメント**: 重要なビジネスロジックに日本語コメント
- **テスト**: 単体テスト（Jest）、APIテスト（Supertest）
- **バージョン管理**: Git + GitHub

---

## 7. デプロイメント構成

### 7.1 開発環境
```
localhost:5173  → Vue.js Dev Server (Vite)
localhost:3000  → Node.js API Server
library.db      → SQLite Database
```

### 7.2 本番環境（社内サーバ想定）
```
http://library.company.local:80  → Nginx（リバースプロキシ）
  ↓
http://localhost:3000            → Node.js API Server (PM2管理)
/opt/library/data/library.db     → SQLite Database
/var/log/library/                → アプリケーションログ
```

**PM2設定例**:
```javascript
module.exports = {
  apps: [{
    name: 'library-api',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

---

## 8. 技術選定理由

### 8.1 Vue.js
- **理由**: 学習コストが低く、小規模チームに適している
- **代替**: React（より大規模なエコシステム）

### 8.2 Node.js + Express
- **理由**: フロントエンドと同じJavaScript、RESTful API構築が容易
- **代替**: Python Flask（より簡潔な記述）

### 8.3 SQLite
- **理由**: サーバレス、セットアップ不要、社内小規模利用に最適
- **代替**: PostgreSQL（より高度な機能が必要な場合）

### 8.4 Cookie Session
- **理由**: シンプル、社内利用で十分なセキュリティ
- **代替**: JWT（マイクロサービス構成の場合）

---

## 9. リスクと制約

### 9.1 リスク
| リスク | 影響 | 対策 |
|--------|------|------|
| SQLiteファイル破損 | 高 | 日次バックアップ自動化 |
| セッションタイムアウト | 中 | 適切なタイムアウト設定（30分） |
| 同時貸出競合 | 低 | トランザクション制御 |

### 9.2 制約
- SQLiteは単一ライタ制約あり（同時書き込み制限）
- 社内ネットワーク限定（外部アクセス不可）
- 管理者は1名のみ想定

---

## 10. 今後の拡張性

### Phase 2（将来検討）
- 書籍予約機能
- 延滞通知メール
- QRコード貸出/返却
- レビュー・評価機能
- PostgreSQLへの移行

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Software Architect Agent
