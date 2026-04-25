# Vue.jsフロントエンド実装設計書

## 1. 概要

### 1.1 技術スタック
- **フレームワーク**: Vue 3.4+ (Composition API)
- **言語**: TypeScript 5.0+
- **ビルドツール**: Vite 5.0+
- **状態管理**: Pinia 2.1+
- **ルーティング**: Vue Router 4.2+
- **HTTP通信**: Axios 1.6+
- **フォームバリデーション**: VeeValidate 4.11+ + Yup
- **UIフレームワーク**: Bootstrap 5.3+ (Bootstrap Vue Next)
- **日付操作**: Day.js
- **アイコン**: Bootstrap Icons

### 1.2 ブラウザ対応
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

---

## 2. ディレクトリ構成

```
client/
├── public/
│   ├── favicon.ico
│   └── logo.png
├── src/
│   ├── assets/                     # 静的リソース
│   │   ├── styles/
│   │   │   ├── main.css           # グローバルスタイル
│   │   │   ├── variables.css      # CSS変数
│   │   │   └── utilities.css      # ユーティリティクラス
│   │   └── images/
│   │       └── no-cover.png       # 書籍表紙デフォルト画像
│   │
│   ├── components/                 # 共通コンポーネント
│   │   ├── layout/
│   │   │   ├── AppHeader.vue      # ヘッダー
│   │   │   ├── AppFooter.vue      # フッター
│   │   │   ├── AppSidebar.vue     # サイドバー（管理画面用）
│   │   │   └── AppLayout.vue      # レイアウトラッパー
│   │   ├── common/
│   │   │   ├── LoadingSpinner.vue # ローディング表示
│   │   │   ├── ErrorAlert.vue     # エラーメッセージ
│   │   │   ├── SuccessToast.vue   # 成功通知
│   │   │   ├── ConfirmModal.vue   # 確認ダイアログ
│   │   │   └── Pagination.vue     # ページネーション
│   │   ├── book/
│   │   │   ├── BookCard.vue       # 書籍カード
│   │   │   ├── BookTable.vue      # 書籍テーブル（管理画面）
│   │   │   ├── BookFilter.vue     # 検索フィルタ
│   │   │   ├── BookForm.vue       # 書籍登録・編集フォーム
│   │   │   └── BookStatusBadge.vue # 貸出状況バッジ
│   │   └── loan/
│   │       ├── LoanCard.vue       # 貸出カード
│   │       ├── LoanTable.vue      # 貸出テーブル
│   │       └── DueDateBadge.vue   # 返却期限バッジ
│   │
│   ├── views/                      # ページコンポーネント
│   │   ├── auth/
│   │   │   ├── LoginView.vue      # ログイン画面
│   │   │   └── RegisterView.vue   # ユーザ登録画面
│   │   ├── books/
│   │   │   ├── BookListView.vue   # 書籍一覧
│   │   │   └── BookDetailView.vue # 書籍詳細
│   │   ├── loans/
│   │   │   └── MyLoansView.vue    # 自分の貸出状況
│   │   ├── admin/
│   │   │   ├── AdminLayout.vue    # 管理画面レイアウト
│   │   │   ├── BookManagementView.vue    # 書籍管理
│   │   │   ├── UserManagementView.vue    # ユーザ管理
│   │   │   ├── LoanManagementView.vue    # 貸出管理
│   │   │   └── DashboardView.vue         # 統計ダッシュボード
│   │   └── NotFoundView.vue       # 404ページ
│   │
│   ├── stores/                     # Pinia状態管理
│   │   ├── auth.ts                # 認証ストア
│   │   ├── books.ts               # 書籍ストア
│   │   ├── loans.ts               # 貸出ストア
│   │   ├── users.ts               # ユーザストア（管理者用）
│   │   └── ui.ts                  # UI状態ストア
│   │
│   ├── services/                   # API通信サービス
│   │   ├── api.ts                 # Axios設定
│   │   ├── authService.ts         # 認証API
│   │   ├── bookService.ts         # 書籍API
│   │   ├── loanService.ts         # 貸出API
│   │   ├── userService.ts         # ユーザAPI
│   │   └── statsService.ts        # 統計API
│   │
│   ├── composables/                # Composition API再利用ロジック
│   │   ├── useAuth.ts             # 認証ロジック
│   │   ├── useBooks.ts            # 書籍操作ロジック
│   │   ├── useLoans.ts            # 貸出操作ロジック
│   │   ├── usePagination.ts      # ページネーションロジック
│   │   ├── useNotification.ts    # 通知ロジック
│   │   └── useDebounce.ts        # デバウンスロジック
│   │
│   ├── utils/                      # ユーティリティ
│   │   ├── validators.ts          # バリデーションルール
│   │   ├── formatters.ts          # フォーマット関数
│   │   ├── constants.ts           # 定数定義
│   │   └── helpers.ts             # ヘルパー関数
│   │
│   ├── types/                      # TypeScript型定義
│   │   ├── auth.types.ts
│   │   ├── book.types.ts
│   │   ├── loan.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   │
│   ├── router/                     # ルーティング
│   │   ├── index.ts               # ルーター設定
│   │   └── guards.ts              # ナビゲーションガード
│   │
│   ├── App.vue                     # ルートコンポーネント
│   └── main.ts                     # エントリーポイント
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## 3. コンポーネント設計

### 3.1 共通レイアウトコンポーネント

#### AppHeader.vue
```vue
<template>
  <header class="bg-primary text-white py-3">
    <div class="container d-flex justify-content-between align-items-center">
      <RouterLink to="/" class="text-white text-decoration-none">
        <h4 class="mb-0">📚 図書館システム</h4>
      </RouterLink>

      <nav v-if="isAuthenticated">
        <ul class="nav">
          <li class="nav-item">
            <RouterLink to="/books" class="nav-link text-white">書籍一覧</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/my-loans" class="nav-link text-white">貸出状況</RouterLink>
          </li>
          <li v-if="isAdmin" class="nav-item">
            <RouterLink to="/admin" class="nav-link text-white">管理画面</RouterLink>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link text-white dropdown-toggle" href="#" role="button"
               data-bs-toggle="dropdown">
              {{ user?.username }}
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" @click="handleLogout">ログアウト</a></li>
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.user?.role === 'admin')
const user = computed(() => authStore.user)

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
```

#### LoadingSpinner.vue
```vue
<template>
  <div class="d-flex justify-content-center align-items-center" :style="{ height }">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <span v-if="message" class="ms-3">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  height?: string
  message?: string
}

withDefaults(defineProps<Props>(), {
  height: '200px',
  message: ''
})
</script>
```

#### Pagination.vue
```vue
<template>
  <nav v-if="totalPages > 1">
    <ul class="pagination justify-content-center">
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <a class="page-link" @click.prevent="emit('update:page', currentPage - 1)">前へ</a>
      </li>

      <li v-for="page in displayPages" :key="page"
          class="page-item" :class="{ active: page === currentPage }">
        <a class="page-link" @click.prevent="emit('update:page', page)">{{ page }}</a>
      </li>

      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <a class="page-link" @click.prevent="emit('update:page', currentPage + 1)">次へ</a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5
})

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const displayPages = computed(() => {
  const pages: number[] = []
  const half = Math.floor(props.maxVisible / 2)
  let start = Math.max(1, props.currentPage - half)
  let end = Math.min(props.totalPages, start + props.maxVisible - 1)

  if (end - start + 1 < props.maxVisible) {
    start = Math.max(1, end - props.maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})
</script>
```

### 3.2 書籍関連コンポーネント

#### BookCard.vue
```vue
<template>
  <div class="card h-100">
    <img :src="bookCover" class="card-img-top" :alt="book.title"
         style="height: 200px; object-fit: cover;">

    <div class="card-body d-flex flex-column">
      <h5 class="card-title">{{ book.title }}</h5>
      <p class="card-text text-muted">{{ book.author }}</p>
      <p class="card-text small">{{ book.publisher }} ({{ book.published_year }})</p>

      <div class="mt-auto">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge bg-secondary">{{ book.category }}</span>
          <BookStatusBadge :available="book.available_stock" :total="book.total_stock" />
        </div>

        <button
          class="btn btn-primary w-100"
          :disabled="!canBorrow"
          @click="emit('borrow', book.id)">
          借りる
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Book } from '@/types/book.types'
import BookStatusBadge from './BookStatusBadge.vue'
import noCoverImage from '@/assets/images/no-cover.png'

interface Props {
  book: Book
}

const props = defineProps<Props>()

const emit = defineEmits<{
  borrow: [bookId: number]
}>()

const bookCover = computed(() => {
  return props.book.cover_url || noCoverImage
})

const canBorrow = computed(() => {
  return props.book.available_stock > 0
})
</script>
```

#### BookFilter.vue
```vue
<template>
  <div class="card mb-4">
    <div class="card-body">
      <form @submit.prevent="handleSearch">
        <div class="row g-3">
          <div class="col-md-6">
            <input
              v-model="filters.search"
              type="text"
              class="form-control"
              placeholder="タイトル・著者名で検索">
          </div>

          <div class="col-md-3">
            <select v-model="filters.category" class="form-select">
              <option value="">すべてのカテゴリ</option>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <div class="col-md-3">
            <div class="form-check">
              <input
                v-model="filters.availableOnly"
                class="form-check-input"
                type="checkbox"
                id="availableOnly">
              <label class="form-check-label" for="availableOnly">
                貸出可能のみ
              </label>
            </div>
          </div>

          <div class="col-12">
            <button type="submit" class="btn btn-primary me-2">検索</button>
            <button type="button" class="btn btn-secondary" @click="handleReset">
              リセット
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { BookFilters } from '@/types/book.types'

interface Props {
  categories?: string[]
}

withDefaults(defineProps<Props>(), {
  categories: () => ['技術書', 'ビジネス書', '小説']
})

const emit = defineEmits<{
  search: [filters: BookFilters]
}>()

const filters = reactive<BookFilters>({
  search: '',
  category: '',
  availableOnly: false
})

const handleSearch = () => {
  emit('search', { ...filters })
}

const handleReset = () => {
  filters.search = ''
  filters.category = ''
  filters.availableOnly = false
  handleSearch()
}
</script>
```

### 3.3 貸出関連コンポーネント

#### LoanCard.vue
```vue
<template>
  <div class="card mb-3">
    <div class="card-body">
      <div class="row align-items-center">
        <div class="col-md-7">
          <h5 class="card-title">{{ loan.book.title }}</h5>
          <p class="card-text text-muted mb-0">{{ loan.book.author }}</p>
        </div>

        <div class="col-md-3">
          <div class="text-muted small">貸出日</div>
          <div>{{ formatDate(loan.loan_date) }}</div>
          <div class="text-muted small mt-2">返却期限</div>
          <div>
            <DueDateBadge :dueDate="loan.due_date" :status="loan.status" />
          </div>
        </div>

        <div class="col-md-2 text-end">
          <button
            v-if="loan.status === 'borrowed'"
            class="btn btn-success"
            @click="emit('return', loan.id)">
            返却する
          </button>
          <span v-else class="badge bg-secondary">返却済</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Loan } from '@/types/loan.types'
import DueDateBadge from './DueDateBadge.vue'
import { formatDate } from '@/utils/formatters'

interface Props {
  loan: Loan
}

defineProps<Props>()

const emit = defineEmits<{
  return: [loanId: number]
}>()
</script>
```

#### DueDateBadge.vue
```vue
<template>
  <span class="badge" :class="badgeClass">
    {{ displayText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { formatDate } from '@/utils/formatters'

interface Props {
  dueDate: string
  status: 'borrowed' | 'returned' | 'overdue'
}

const props = defineProps<Props>()

const daysUntilDue = computed(() => {
  return dayjs(props.dueDate).diff(dayjs(), 'day')
})

const badgeClass = computed(() => {
  if (props.status === 'returned') return 'bg-secondary'
  if (props.status === 'overdue') return 'bg-danger'
  if (daysUntilDue.value <= 3) return 'bg-warning'
  return 'bg-success'
})

const displayText = computed(() => {
  if (props.status === 'returned') return '返却済'
  if (props.status === 'overdue') return `延滞中（${Math.abs(daysUntilDue.value)}日超過）`
  if (daysUntilDue.value === 0) return '今日が期限'
  if (daysUntilDue.value < 0) return `延滞中（${Math.abs(daysUntilDue.value)}日超過）`
  return `${formatDate(props.dueDate)}（残り${daysUntilDue.value}日）`
})
</script>
```

---

## 4. 状態管理（Pinia）

### 4.1 認証ストア (auth.ts)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginCredentials, RegisterData } from '@/types/auth.types'
import * as authService from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Actions
  async function login(credentials: LoginCredentials) {
    loading.value = true
    error.value = null
    try {
      const response = await authService.login(credentials)
      user.value = response.data.user
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'ログインに失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(data: RegisterData) {
    loading.value = true
    error.value = null
    try {
      const response = await authService.register(data)
      user.value = response.data.user
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'ユーザ登録に失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      user.value = null
    }
  }

  async function checkAuth() {
    try {
      const response = await authService.getCurrentUser()
      user.value = response.data.user
      return true
    } catch {
      user.value = null
      return false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    checkAuth,
    clearError
  }
})
```

### 4.2 書籍ストア (books.ts)

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Book, BookFilters, PaginatedBooks } from '@/types/book.types'
import * as bookService from '@/services/bookService'

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref<Book[]>([])
  const currentBook = ref<Book | null>(null)
  const pagination = ref({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 12
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function fetchBooks(filters: BookFilters = {}, page = 1) {
    loading.value = true
    error.value = null
    try {
      const response = await bookService.getBooks({
        ...filters,
        page,
        limit: pagination.value.limit
      })
      books.value = response.data.books
      pagination.value = {
        ...pagination.value,
        ...response.data.pagination
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '書籍の取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function fetchBookById(id: number) {
    loading.value = true
    error.value = null
    try {
      const response = await bookService.getBookById(id)
      currentBook.value = response.data.book
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '書籍詳細の取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function createBook(bookData: Partial<Book>) {
    loading.value = true
    error.value = null
    try {
      await bookService.createBook(bookData)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '書籍の登録に失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateBook(id: number, bookData: Partial<Book>) {
    loading.value = true
    error.value = null
    try {
      await bookService.updateBook(id, bookData)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '書籍の更新に失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteBook(id: number) {
    loading.value = true
    error.value = null
    try {
      await bookService.deleteBook(id)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '書籍の削除に失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    books,
    currentBook,
    pagination,
    loading,
    error,
    fetchBooks,
    fetchBookById,
    createBook,
    updateBook,
    deleteBook
  }
})
```

### 4.3 貸出ストア (loans.ts)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Loan, LoanSummary } from '@/types/loan.types'
import * as loanService from '@/services/loanService'

export const useLoansStore = defineStore('loans', () => {
  // State
  const myLoans = ref<Loan[]>([])
  const loanSummary = ref<LoanSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeLoanCount = computed(() =>
    myLoans.value.filter(loan => loan.status === 'borrowed').length
  )

  const canBorrowMore = computed(() =>
    loanSummary.value ? loanSummary.value.available_slots > 0 : false
  )

  // Actions
  async function fetchMyLoans() {
    loading.value = true
    error.value = null
    try {
      const response = await loanService.getMyLoans()
      myLoans.value = response.data.loans
      loanSummary.value = response.data.summary
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '貸出情報の取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function borrowBook(bookId: number) {
    loading.value = true
    error.value = null
    try {
      await loanService.borrowBook(bookId)
      await fetchMyLoans()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '貸出処理に失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  async function returnBook(loanId: number) {
    loading.value = true
    error.value = null
    try {
      await loanService.returnBook(loanId)
      await fetchMyLoans()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || '返却処理に失敗しました'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    myLoans,
    loanSummary,
    loading,
    error,
    activeLoanCount,
    canBorrowMore,
    fetchMyLoans,
    borrowBook,
    returnBook
  }
})
```

---

## 5. ルーティング設計

### 5.1 ルーター設定 (router/index.ts)

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, adminGuard } from './guards'

const routes = [
  {
    path: '/',
    redirect: '/books'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/books',
    name: 'books',
    component: () => import('@/views/books/BookListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/books/:id',
    name: 'book-detail',
    component: () => import('@/views/books/BookDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-loans',
    name: 'my-loans',
    component: () => import('@/views/loans/MyLoansView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/DashboardView.vue')
      },
      {
        path: 'books',
        name: 'admin-books',
        component: () => import('@/views/admin/BookManagementView.vue')
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/views/admin/UserManagementView.vue')
      },
      {
        path: 'loans',
        name: 'admin-loans',
        component: () => import('@/views/admin/LoanManagementView.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(authGuard)
router.beforeEach(adminGuard)

export default router
```

### 5.2 ナビゲーションガード (router/guards.ts)

```typescript
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export async function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const authStore = useAuthStore()

  // 初回アクセス時にセッション確認
  if (authStore.user === null) {
    await authStore.checkAuth()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (requiresGuest && authStore.isAuthenticated) {
    next({ name: 'books' })
  } else {
    next()
  }
}

export function adminGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const authStore = useAuthStore()
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)

  if (requiresAdmin && !authStore.isAdmin) {
    next({ name: 'books' })
  } else {
    next()
  }
}
```

---

## 6. API連携設計

### 6.1 Axios設定 (services/api.ts)

```typescript
import axios, { AxiosError } from 'axios'
import type { ApiResponse, ApiError } from '@/types/api.types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // 認証エラー時はログイン画面へリダイレクト
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### 6.2 認証サービス (services/authService.ts)

```typescript
import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type { User, LoginCredentials, RegisterData } from '@/types/auth.types'

export function login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User }>> {
  return api.post('/auth/login', credentials)
}

export function register(data: RegisterData): Promise<ApiResponse<{ user: User }>> {
  return api.post('/auth/register', data)
}

export function logout(): Promise<ApiResponse<void>> {
  return api.post('/auth/logout')
}

export function getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
  return api.get('/auth/me')
}
```

### 6.3 書籍サービス (services/bookService.ts)

```typescript
import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type { Book, BookFilters, PaginatedBooks } from '@/types/book.types'

export function getBooks(params: BookFilters & { page?: number; limit?: number }):
  Promise<ApiResponse<PaginatedBooks>> {
  return api.get('/books', { params })
}

export function getBookById(id: number): Promise<ApiResponse<{ book: Book }>> {
  return api.get(`/books/${id}`)
}

export function createBook(data: Partial<Book>): Promise<ApiResponse<{ book: Book }>> {
  return api.post('/books', data)
}

export function updateBook(id: number, data: Partial<Book>):
  Promise<ApiResponse<{ book: Book }>> {
  return api.put(`/books/${id}`, data)
}

export function deleteBook(id: number): Promise<ApiResponse<void>> {
  return api.delete(`/books/${id}`)
}
```

### 6.4 貸出サービス (services/loanService.ts)

```typescript
import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type { Loan, LoanSummary } from '@/types/loan.types'

export function getMyLoans():
  Promise<ApiResponse<{ loans: Loan[]; summary: LoanSummary }>> {
  return api.get('/loans/my-loans')
}

export function borrowBook(bookId: number): Promise<ApiResponse<{ loan: Loan }>> {
  return api.post('/loans', { book_id: bookId })
}

export function returnBook(loanId: number): Promise<ApiResponse<{ loan: Loan }>> {
  return api.put(`/loans/${loanId}/return`)
}

export function getLoans(params: {
  user_id?: number
  status?: string
  page?: number
  limit?: number
}): Promise<ApiResponse<{ loans: Loan[] }>> {
  return api.get('/loans', { params })
}
```

---

## 7. フォームバリデーション

### 7.1 バリデーションルール (utils/validators.ts)

```typescript
import * as yup from 'yup'

export const loginSchema = yup.object({
  username: yup
    .string()
    .required('ユーザ名を入力してください')
    .min(3, 'ユーザ名は3文字以上で入力してください'),
  password: yup
    .string()
    .required('パスワードを入力してください')
})

export const registerSchema = yup.object({
  username: yup
    .string()
    .required('ユーザ名を入力してください')
    .min(3, 'ユーザ名は3文字以上で入力してください')
    .max(20, 'ユーザ名は20文字以内で入力してください')
    .matches(/^[a-zA-Z0-9_]+$/, 'ユーザ名は英数字とアンダースコアのみ使用できます'),
  password: yup
    .string()
    .required('パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'パスワードは英数字を含む必要があります'),
  email: yup
    .string()
    .required('メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
})

export const bookSchema = yup.object({
  isbn: yup
    .string()
    .required('ISBNを入力してください')
    .matches(
      /^(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\s]){3})[-\s0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[-\s]){4})[-\s0-9]{17}$)(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9X]$/,
      '有効なISBNを入力してください'
    ),
  title: yup
    .string()
    .required('タイトルを入力してください')
    .max(200, 'タイトルは200文字以内で入力してください'),
  author: yup
    .string()
    .required('著者名を入力してください')
    .max(100, '著者名は100文字以内で入力してください'),
  publisher: yup
    .string()
    .max(100, '出版社名は100文字以内で入力してください'),
  published_year: yup
    .number()
    .min(1900, '1900年以降の年を入力してください')
    .max(new Date().getFullYear(), '未来の年は入力できません'),
  category: yup
    .string()
    .required('カテゴリを選択してください'),
  total_stock: yup
    .number()
    .required('在庫数を入力してください')
    .min(1, '在庫数は1以上で入力してください')
    .max(3, '同一タイトルは最大3冊まで登録できます')
})
```

### 7.2 VeeValidate使用例

```vue
<template>
  <form @submit="onSubmit">
    <div class="mb-3">
      <label class="form-label">ユーザ名</label>
      <input
        v-model="username"
        type="text"
        class="form-control"
        :class="{ 'is-invalid': errors.username }">
      <div class="invalid-feedback">{{ errors.username }}</div>
    </div>

    <div class="mb-3">
      <label class="form-label">パスワード</label>
      <input
        v-model="password"
        type="password"
        class="form-control"
        :class="{ 'is-invalid': errors.password }">
      <div class="invalid-feedback">{{ errors.password }}</div>
    </div>

    <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
      ログイン
    </button>
  </form>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { loginSchema } from '@/utils/validators'

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema: loginSchema
})

const [username] = defineField('username')
const [password] = defineField('password')

const onSubmit = handleSubmit(async (values) => {
  console.log('Form submitted:', values)
  // ログイン処理
})
</script>
```

---

## 8. TypeScript型定義

### 8.1 認証型 (types/auth.types.ts)

```typescript
export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  updated_at?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  password: string
  email: string
}
```

### 8.2 書籍型 (types/book.types.ts)

```typescript
export interface Book {
  id: number
  isbn: string
  title: string
  author: string
  publisher: string
  published_year: number
  category: string
  total_stock: number
  available_stock: number
  cover_url?: string
  created_at: string
  updated_at?: string
}

export interface BookFilters {
  search?: string
  category?: string
  availableOnly?: boolean
}

export interface PaginatedBooks {
  books: Book[]
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
    limit: number
  }
}
```

### 8.3 貸出型 (types/loan.types.ts)

```typescript
export interface Loan {
  id: number
  user: {
    id: number
    username: string
  }
  book: {
    id: number
    isbn: string
    title: string
    author: string
  }
  loan_date: string
  due_date: string
  return_date: string | null
  status: 'borrowed' | 'returned' | 'overdue'
  days_until_due?: number
}

export interface LoanSummary {
  total_borrowed: number
  max_allowed: number
  available_slots: number
}
```

---

## 9. 開発環境セットアップ

### 9.1 package.json

```json
{
  "name": "library-system-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "axios": "^1.6.0",
    "vee-validate": "^4.11.0",
    "yup": "^1.3.0",
    "dayjs": "^1.11.0",
    "bootstrap": "^5.3.0",
    "bootstrap-icons": "^1.11.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vue-tsc": "^1.8.0",
    "vite": "^5.0.0",
    "sass": "^1.69.0",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.55.0",
    "eslint-plugin-vue": "^9.19.0",
    "prettier": "^3.1.0"
  }
}
```

### 9.2 vite.config.ts

```typescript
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
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000
  }
})
```

### 9.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 9.4 .env.example

```
# API Base URL
VITE_API_BASE_URL=http://localhost:3000/api

# Environment
VITE_APP_ENV=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
```

---

## 10. セットアップ手順

### 10.1 初期セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数設定
cp .env.example .env

# 開発サーバー起動
npm run dev
```

### 10.2 ビルドとデプロイ

```bash
# プロダクションビルド
npm run build

# ビルド結果プレビュー
npm run preview

# distディレクトリをWebサーバーにデプロイ
# Nginxの場合: /var/www/library-system/
```

### 10.3 Nginx設定例

```nginx
server {
    listen 80;
    server_name library.company.local;
    root /var/www/library-system;
    index index.html;

    # Vue Router用設定（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # APIプロキシ
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 静的ファイルのキャッシュ
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 11. パフォーマンス最適化

### 11.1 コード分割

```typescript
// ルート定義で動的インポート使用
{
  path: '/books',
  component: () => import('@/views/books/BookListView.vue')
}

// 大きいライブラリの遅延読み込み
const dayjs = () => import('dayjs')
```

### 11.2 画像最適化

```vue
<template>
  <img
    :src="book.cover_url"
    :alt="book.title"
    loading="lazy"
    width="200"
    height="300">
</template>
```

### 11.3 仮想スクロール（大量データ表示時）

```bash
npm install vue-virtual-scroller
```

```vue
<template>
  <RecycleScroller
    :items="books"
    :item-size="200"
    key-field="id">
    <template #default="{ item }">
      <BookCard :book="item" />
    </template>
  </RecycleScroller>
</template>
```

---

## 12. テスト戦略

### 12.1 単体テスト（Vitest）

```typescript
// tests/stores/auth.spec.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should login successfully', async () => {
    const authStore = useAuthStore()
    const result = await authStore.login({
      username: 'testuser',
      password: 'test1234'
    })
    expect(result).toBe(true)
    expect(authStore.isAuthenticated).toBe(true)
  })
})
```

### 12.2 E2Eテスト（Playwright）

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('should login and access books page', async ({ page }) => {
  await page.goto('http://localhost:5173/login')

  await page.fill('input[name="username"]', 'testuser')
  await page.fill('input[name="password"]', 'test1234')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('http://localhost:5173/books')
  await expect(page.locator('h1')).toContainText('書籍一覧')
})
```

---

## 13. エラーハンドリング

### 13.1 グローバルエラーハンドラー

```typescript
// main.ts
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Component:', instance)
  console.error('Error info:', info)

  // エラートラッキングサービスへ送信（本番環境）
  if (import.meta.env.PROD) {
    // sendToErrorTracking(err, info)
  }
}
```

### 13.2 API エラーハンドリング

```typescript
// composables/useNotification.ts
export function useNotification() {
  const showError = (message: string) => {
    // Bootstrap Toastでエラー表示
    const toast = new bootstrap.Toast(document.getElementById('error-toast'))
    toast.show()
  }

  const showSuccess = (message: string) => {
    const toast = new bootstrap.Toast(document.getElementById('success-toast'))
    toast.show()
  }

  return { showError, showSuccess }
}
```

---

## 14. アクセシビリティ対応

### 14.1 基本方針

- すべてのインタラクティブ要素はキーボードアクセス可能
- 適切なARIA属性の使用
- フォーカス管理の実装
- スクリーンリーダー対応

### 14.2 実装例

```vue
<template>
  <button
    class="btn btn-primary"
    :aria-label="`${book.title}を借りる`"
    :disabled="!canBorrow"
    @click="borrowBook">
    借りる
  </button>

  <div
    role="alert"
    aria-live="polite"
    v-if="error">
    {{ error }}
  </div>
</template>
```

---

## 15. レスポンシブデザイン

### 15.1 ブレイクポイント

```css
/* variables.css */
:root {
  --breakpoint-xs: 0;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
}
```

### 15.2 モバイル対応

```vue
<template>
  <!-- モバイル: カード表示 -->
  <div class="d-md-none">
    <BookCard
      v-for="book in books"
      :key="book.id"
      :book="book" />
  </div>

  <!-- デスクトップ: テーブル表示 -->
  <div class="d-none d-md-block">
    <BookTable :books="books" />
  </div>
</template>
```

---

## 16. 今後の拡張計画

### Phase 2 機能候補
- 書籍予約機能
- QRコードスキャン
- メール通知機能
- レビュー・評価機能
- ダークモード対応
- PWA対応（オフライン機能）

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Frontend Architect Agent
