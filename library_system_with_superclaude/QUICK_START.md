# 図書館システム クイックスタート

このガイドは、図書館管理システムのバックエンド・フロントエンドを素早くセットアップして動作させるための手順書です。

---

## Part 1: バックエンドセットアップ（Node.js + Express + SQLite）

### ステップ1: プロジェクトセットアップ

```bash
# サーバーディレクトリ作成・移動
cd library_system_with_superclaude
mkdir -p server
cd server

# package.json初期化
npm init -y

# 依存パッケージインストール
npm install express sqlite3 express-session connect-sqlite3 \
  bcrypt express-validator helmet cors winston dotenv \
  express-rate-limit csurf

# 開発依存パッケージ
npm install --save-dev nodemon jest supertest eslint prettier
```

### ステップ2: ディレクトリ構造作成

```bash
mkdir -p src/{config,middleware,controllers,services,repositories,models,routes,utils,db/migrations}
mkdir -p tests/{unit,integration}
mkdir -p scripts logs data
```

### ステップ3: 環境変数設定

```bash
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
HOST=localhost

DATABASE_PATH=./data/library.db
SESSIONS_DB_PATH=./data/sessions.db

SESSION_SECRET=CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION
SESSION_MAX_AGE=1800000

BCRYPT_SALT_ROUNDS=10
LOG_LEVEL=info
LOG_DIR=./logs

CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
EOF
```

### ステップ4: データベース初期化

```bash
# スクリプトをコピー（BACKEND_IMPLEMENTATION.mdから）
# scripts/initDatabase.js
# scripts/seedDatabase.js

# データベース初期化スクリプト実行
node scripts/initDatabase.js
node scripts/seedDatabase.js
```

### ステップ5: package.json設定

```bash
cat > package.json << 'EOF'
{
  "name": "library-api",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage",
    "db:init": "node scripts/initDatabase.js",
    "db:seed": "node scripts/seedDatabase.js"
  }
}
EOF
```

### ステップ6: サーバー起動

```bash
# 開発モード起動
npm run dev

# ブラウザで http://localhost:3000/health にアクセスして確認
```

**デフォルトアカウント**:
- 管理者: `admin` / `admin123`
- ユーザ: `user1` / `user1234`

**詳細実装**: `BACKEND_IMPLEMENTATION.md` を参照

---

## Part 2: フロントエンドセットアップ（Vue 3 + TypeScript）

## 1. すぐに始める

### ステップ1: プロジェクトセットアップ

```bash
# clientディレクトリ作成
cd library_system_with_superclaude
mkdir -p client
cd client

# Vue 3 + TypeScript プロジェクト作成
npm create vite@latest . -- --template vue-ts

# 依存関係インストール
npm install
npm install vue-router@4 pinia@2 axios@1 vee-validate@4 yup@1 dayjs@1
npm install bootstrap@5 bootstrap-icons@1

# 開発用依存関係
npm install -D sass @types/node
```

### ステップ2: ディレクトリ構成作成

```bash
# 必要なディレクトリを作成
mkdir -p src/{assets/{styles,images},components/{layout,common,book,loan},views/{auth,books,loans,admin},stores,services,composables,utils,types,router}

# 環境変数ファイル作成
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development
EOF
```

### ステップ3: Vite設定

```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
EOF
```

### ステップ4: TypeScript設定

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
EOF
```

### ステップ5: 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 にアクセス

---

## 2. 実装の優先順位

### Phase 1: 基本機能（1週間）

#### Day 1-2: 基盤整備
- [ ] TypeScript型定義作成 (types/)
- [ ] Axios設定とAPIサービス (services/)
- [ ] ルーター設定 (router/)
- [ ] 共通レイアウトコンポーネント (components/layout/)

#### Day 3-4: 認証機能
- [ ] 認証ストア (stores/auth.ts)
- [ ] ログイン画面 (views/auth/LoginView.vue)
- [ ] ユーザ登録画面 (views/auth/RegisterView.vue)
- [ ] ナビゲーションガード (router/guards.ts)

#### Day 5-7: 書籍機能
- [ ] 書籍ストア (stores/books.ts)
- [ ] 書籍一覧画面 (views/books/BookListView.vue)
- [ ] 書籍カードコンポーネント (components/book/BookCard.vue)
- [ ] 検索フィルタ (components/book/BookFilter.vue)
- [ ] 書籍詳細画面 (views/books/BookDetailView.vue)

### Phase 2: 貸出機能（3日間）

#### Day 8-9: 貸出・返却
- [ ] 貸出ストア (stores/loans.ts)
- [ ] 自分の貸出一覧 (views/loans/MyLoansView.vue)
- [ ] 貸出カード (components/loan/LoanCard.vue)
- [ ] 返却期限バッジ (components/loan/DueDateBadge.vue)

#### Day 10: 統合テスト
- [ ] 貸出フロー動作確認
- [ ] エラーハンドリング確認

### Phase 3: 管理機能（1週間）

#### Day 11-13: 管理画面基盤
- [ ] 管理画面レイアウト (views/admin/AdminLayout.vue)
- [ ] ダッシュボード (views/admin/DashboardView.vue)
- [ ] 統計API連携 (services/statsService.ts)

#### Day 14-16: 書籍管理
- [ ] 書籍管理画面 (views/admin/BookManagementView.vue)
- [ ] 書籍フォーム (components/book/BookForm.vue)
- [ ] 書籍テーブル (components/book/BookTable.vue)

#### Day 17: ユーザ・貸出管理
- [ ] ユーザ管理画面 (views/admin/UserManagementView.vue)
- [ ] 貸出管理画面 (views/admin/LoanManagementView.vue)

---

## 3. 実装チェックリスト

### 基本機能
- [ ] ログイン・ログアウト機能
- [ ] ユーザ登録機能
- [ ] 書籍一覧表示
- [ ] 書籍検索（タイトル・著者）
- [ ] カテゴリフィルタ
- [ ] 貸出可能のみ表示
- [ ] 書籍詳細表示
- [ ] 書籍を借りる機能
- [ ] 自分の貸出一覧
- [ ] 書籍を返却する機能

### 管理機能
- [ ] 管理者権限チェック
- [ ] 統計ダッシュボード
- [ ] 書籍登録
- [ ] 書籍編集
- [ ] 書籍削除
- [ ] ユーザ一覧
- [ ] ユーザ削除
- [ ] 貸出一覧（全体）
- [ ] 延滞書籍一覧

### 非機能要件
- [ ] レスポンシブデザイン（モバイル対応）
- [ ] ローディング表示
- [ ] エラーメッセージ表示
- [ ] 成功通知
- [ ] フォームバリデーション
- [ ] ページネーション
- [ ] 確認ダイアログ
- [ ] キーボードナビゲーション
- [ ] アクセシビリティ対応

---

## 4. 重要な実装ポイント

### 4.1 認証フロー

```typescript
// 1. ログイン時
const authStore = useAuthStore()
await authStore.login({ username, password })
router.push('/books')

// 2. ページ読み込み時（セッション復元）
onMounted(async () => {
  await authStore.checkAuth()
})

// 3. API呼び出し時（自動的にCookie送信）
const response = await bookService.getBooks()
```

### 4.2 エラーハンドリング

```typescript
// すべてのAPI呼び出しでtry-catchを使用
try {
  await loanStore.borrowBook(bookId)
  showSuccess('書籍を借りました')
} catch (error: any) {
  showError(error.response?.data?.error?.message || '処理に失敗しました')
}
```

### 4.3 状態管理の流れ

```
User Action → Component → Store → API Service → Backend API
                ↑                                      ↓
                └──────── State Update ←──────────────┘
```

### 4.4 ルーティングガード

```typescript
// 認証が必要なページ
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
```

---

## 5. よくある問題と解決法

### 問題1: CORSエラー

**解決法**: vite.config.tsでプロキシ設定

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

### 問題2: Cookieが送信されない

**解決法**: axiosで`withCredentials: true`を設定

```typescript
const api = axios.create({
  baseURL: '/api',
  withCredentials: true  // これが必須
})
```

### 問題3: ページリロード時にログアウトされる

**解決法**: App.vueでセッション確認

```typescript
// App.vue
onMounted(async () => {
  await authStore.checkAuth()
})
```

### 問題4: 型エラーが出る

**解決法**: TypeScript型定義を正確に作成

```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
```

---

## 6. テストの実行

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

---

## 7. デバッグツール

### Vue DevTools

- Chrome拡張機能をインストール
- コンポーネント構造確認
- Pinia状態確認
- イベント追跡

### ブラウザ開発者ツール

```javascript
// コンソールでストア確認
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
console.log(authStore.user)
```

---

## 8. 次のステップ

1. **FRONTEND.mdを熟読**: 詳細な設計書を確認
2. **型定義から開始**: types/ディレクトリのファイルを作成
3. **APIサービス作成**: services/ディレクトリのファイルを作成
4. **ストア実装**: stores/ディレクトリのファイルを作成
5. **コンポーネント実装**: 共通コンポーネントから始める
6. **ページ実装**: 認証画面 → 書籍一覧 → 管理画面の順

---

## 9. 参考リソース

- **Vue 3公式**: https://vuejs.org/
- **Vue Router**: https://router.vuejs.org/
- **Pinia**: https://pinia.vuejs.org/
- **VeeValidate**: https://vee-validate.logaretm.com/
- **Bootstrap 5**: https://getbootstrap.com/
- **Axios**: https://axios-http.com/

---

**実装に関する質問や問題があれば、FRONTEND.mdの該当セクションを参照してください。**

**作成日**: 2025-01-11
**バージョン**: 1.0
