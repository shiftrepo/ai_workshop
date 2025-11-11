# 図書貸出システム - 包括的テスト戦略

**対象システム**: 図書貸出システム (Node.js + Express + SQLite + Vue 3)
**作成日**: 2025-01-11
**バージョン**: 1.0
**担当**: Quality Engineer

---

## 目次

1. [テスト戦略概要](#1-テスト戦略概要)
2. [テストレベル定義](#2-テストレベル定義)
3. [テストスコープとカバレッジ](#3-テストスコープとカバレッジ)
4. [テスト環境](#4-テスト環境)
5. [単体テスト](#5-単体テスト)
6. [統合テスト](#6-統合テスト)
7. [E2Eテスト](#7-e2eテスト)
8. [API自動テスト](#8-api自動テスト)
9. [パフォーマンステスト](#9-パフォーマンステスト)
10. [セキュリティテスト](#10-セキュリティテスト)
11. [テストデータ戦略](#11-テストデータ戦略)
12. [CI/CD統合](#12-cicd統合)
13. [テスト実行計画](#13-テスト実行計画)
14. [品質メトリクス](#14-品質メトリクス)

---

## 1. テスト戦略概要

### 1.1 テストアプローチ

**テストピラミッド戦略**:
```
         /\
        /E2E\       ← 10-20% (重要なユーザジャーニー)
       /------\
      /  統合  \    ← 30-40% (API・DB連携)
     /----------\
    /   単体     \  ← 50-60% (ビジネスロジック)
   /--------------\
```

**重点テスト領域**:
1. **クリティカルパス**: 貸出・返却フロー
2. **ビジネスルール**: 3冊制限、2週間期限、在庫管理
3. **セキュリティ**: 認証・認可、入力検証
4. **データ整合性**: トランザクション、同時アクセス

### 1.2 テスト原則

- **早期テスト**: 開発と並行してテストを作成
- **自動化優先**: 繰り返し実行可能なテストを自動化
- **リスクベース**: 高リスク機能に重点を置く
- **継続的テスト**: CI/CDパイプラインでの自動実行
- **データドリブン**: 複数のデータパターンで検証

### 1.3 品質目標

| メトリクス | 目標値 | 測定方法 |
|-----------|-------|---------|
| 単体テストカバレッジ | 80%以上 | Jest/Vitest カバレッジレポート |
| 統合テストカバレッジ | 70%以上 | API エンドポイントカバレッジ |
| E2Eテストカバレッジ | 主要シナリオ100% | ユーザジャーニーチェックリスト |
| バグ検出率 | リリース前90%以上 | デフェクト追跡 |
| テスト実行時間 | 単体: <5分, E2E: <15分 | CI/CDパイプライン |

---

## 2. テストレベル定義

### 2.1 単体テスト (Unit Tests)

**目的**: 個別のコンポーネント・関数・クラスの動作検証

**スコープ**:
- バックエンド: Service層、Repository層、ユーティリティ関数
- フロントエンド: Pinia ストア、Composables、ユーティリティ関数

**ツール**:
- バックエンド: Jest + Supertest
- フロントエンド: Vitest + Vue Test Utils

**実行タイミング**: コミット時、PR作成時

### 2.2 統合テスト (Integration Tests)

**目的**: コンポーネント間の連携動作検証

**スコープ**:
- API エンドポイント + データベース連携
- サービス層 + リポジトリ層連携
- 認証フロー全体

**ツール**: Jest + Supertest + SQLite (テスト用DB)

**実行タイミング**: PR作成時、マージ前

### 2.3 E2Eテスト (End-to-End Tests)

**目的**: ユーザの実際の操作フローを検証

**スコープ**:
- ログイン → 書籍検索 → 貸出 → 返却
- 管理者機能（書籍登録、ユーザ管理）

**ツール**: Playwright

**実行タイミング**: デプロイ前、定期実行（夜間）

### 2.4 API自動テスト

**目的**: REST API仕様への準拠確認

**スコープ**: 全9エンドポイント × 正常系・異常系

**ツール**: Jest + Supertest または Postman/Newman

**実行タイミング**: PR作成時、マージ前

### 2.5 パフォーマンステスト

**目的**: 負荷条件下での性能検証

**スコープ**:
- API レスポンスタイム測定
- 同時接続数テスト
- データベースクエリ最適化検証

**ツール**: Artillery.io または k6

**実行タイミング**: リリース前、定期実行（週次）

### 2.6 セキュリティテスト

**目的**: 脆弱性の検出と対策確認

**スコープ**:
- 認証・認可テスト
- SQLインジェクション対策
- XSS対策
- CSRF対策

**ツール**: Jest + 手動セキュリティレビュー + OWASP ZAP (オプション)

**実行タイミング**: リリース前、セキュリティレビュー時

---

## 3. テストスコープとカバレッジ

### 3.1 機能別テスト優先度

| 機能 | 優先度 | 単体 | 統合 | E2E | 備考 |
|-----|-------|-----|-----|-----|-----|
| ユーザ認証 | ★★★ | ○ | ○ | ○ | セキュリティクリティカル |
| 書籍検索 | ★★☆ | ○ | ○ | ○ | 主要機能 |
| 貸出処理 | ★★★ | ○ | ○ | ○ | ビジネスロジッククリティカル |
| 返却処理 | ★★★ | ○ | ○ | ○ | ビジネスロジッククリティカル |
| 書籍管理(管理者) | ★★☆ | ○ | ○ | △ | 管理機能 |
| ユーザ管理(管理者) | ★☆☆ | ○ | ○ | △ | 管理機能 |
| 延滞管理 | ★★☆ | ○ | ○ | △ | ビジネスロジック |
| 統計表示 | ★☆☆ | ○ | △ | × | 参照系 |

**凡例**: ○=必須, △=推奨, ×=不要

### 3.2 エッジケース優先リスト

#### 貸出ビジネスロジック
1. **3冊制限**:
   - 既に3冊借りている状態で4冊目を借りようとする
   - 2冊借りた直後に3冊目を借りる（タイミング問題）

2. **在庫管理**:
   - 在庫1の書籍を2人が同時に借りようとする
   - 在庫0の書籍を借りようとする
   - 返却時の在庫増加処理

3. **期限管理**:
   - 貸出日から正確に14日後の日付計算
   - 延滞判定タイミング（日付変更時）
   - 返却期限当日の返却

4. **重複貸出防止**:
   - 同一ユーザが同じ書籍を2回借りようとする

#### 認証・認可
1. **セッション管理**:
   - セッション有効期限切れ
   - 複数タブでのログアウト
   - セッション固定攻撃対策

2. **権限チェック**:
   - 一般ユーザが管理者APIにアクセス
   - 未認証ユーザが保護されたAPIにアクセス
   - 他のユーザの貸出情報にアクセス

#### データ整合性
1. **トランザクション**:
   - 貸出処理中のエラー（在庫減少後にエラー）
   - 返却処理中のエラー（在庫増加前にエラー）

2. **同時アクセス**:
   - 複数ユーザが同時に同じ書籍を借りる
   - 書籍削除中に貸出処理

---

## 4. テスト環境

### 4.1 環境構成

| 環境 | 用途 | データベース | API URL |
|-----|------|------------|---------|
| ローカル開発 | 開発者個人のテスト | SQLite (開発用) | http://localhost:3000 |
| CI/CD | 自動テスト実行 | SQLite (インメモリ) | http://localhost:3000 |
| ステージング | 統合テスト・E2E | SQLite (ステージング用) | http://staging.library.local |
| 本番 | 本番運用 | SQLite (本番用) | http://library.company.local |

### 4.2 テストデータベース設定

**テスト用データベース初期化スクリプト**:
```javascript
// tests/setup/testDatabase.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function createTestDatabase() {
  const testDbPath = ':memory:'; // インメモリDB
  const db = new sqlite3.Database(testDbPath);

  // スキーマ適用
  const schema = fs.readFileSync(
    path.join(__dirname, '../../src/db/schema.sql'),
    'utf8'
  );
  db.exec(schema);

  return db;
}

function seedTestData(db) {
  // テスト用初期データ投入
  const testData = [
    // ユーザ
    { username: 'testuser1', role: 'user' },
    { username: 'testadmin', role: 'admin' },

    // 書籍（在庫パターン）
    { title: 'Test Book 1', available_stock: 1 }, // 在庫1
    { title: 'Test Book 2', available_stock: 0 }, // 在庫0
    { title: 'Test Book 3', available_stock: 3 }  // 在庫3
  ];

  // データ挿入処理
}

module.exports = { createTestDatabase, seedTestData };
```

### 4.3 モックとスタブ

**外部依存のモック化**:
- メール送信サービス → Mock実装
- 日時取得 → 固定値で制御可能に
- ランダム値生成 → シード値で再現性確保

---

## 5. 単体テスト

### 5.1 バックエンド単体テスト

#### 5.1.1 テスト対象

**Service層のテスト**:
```javascript
// tests/unit/services/loanService.test.js
describe('LoanService.createLoan', () => {
  beforeEach(() => {
    // モックのリセット
  });

  describe('正常系', () => {
    it('在庫がある場合、貸出を作成できる', async () => {
      // Given: 在庫1の書籍、貸出0のユーザ
      const userId = 1;
      const bookId = 2;

      // When: 貸出を作成
      const loan = await loanService.createLoan(userId, bookId);

      // Then: 貸出レコードが作成され、在庫が減る
      expect(loan).toHaveProperty('id');
      expect(loan.status).toBe('borrowed');

      const book = await bookRepository.findById(bookId);
      expect(book.available_stock).toBe(0); // 1 → 0
    });
  });

  describe('異常系', () => {
    it('貸出上限（3冊）に達している場合、エラーを返す', async () => {
      // Given: 既に3冊借りているユーザ
      const userId = 1;
      const bookId = 5;

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects.toThrow('貸出上限（3冊）に達しています');
    });

    it('在庫が0の場合、エラーを返す', async () => {
      // Given: 在庫0の書籍
      const userId = 1;
      const bookId = 2;

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects.toThrow('この書籍は現在貸出中です');
    });

    it('重複貸出を防止する', async () => {
      // Given: ユーザが既に借りている書籍
      const userId = 1;
      const bookId = 2; // 既に借りている

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects.toThrow('この書籍は既に借りています');
    });
  });

  describe('エッジケース', () => {
    it('返却期限が正確に14日後に設定される', async () => {
      // Given
      const userId = 1;
      const bookId = 2;
      const today = new Date('2025-01-11T10:00:00Z');
      jest.useFakeTimers().setSystemTime(today);

      // When
      const loan = await loanService.createLoan(userId, bookId);

      // Then
      const expectedDueDate = new Date('2025-01-25T10:00:00Z');
      expect(new Date(loan.due_date)).toEqual(expectedDueDate);

      jest.useRealTimers();
    });
  });
});
```

**Repository層のテスト**:
```javascript
// tests/unit/repositories/bookRepository.test.js
describe('BookRepository.updateStock', () => {
  it('在庫を正しく増減できる', async () => {
    // Given
    const bookId = 1;
    const initialStock = 2;

    // When: 在庫を-1する
    await bookRepository.updateStock(bookId, -1);

    // Then
    const book = await bookRepository.findById(bookId);
    expect(book.available_stock).toBe(initialStock - 1);
  });

  it('在庫がマイナスにならない', async () => {
    // Given: 在庫1の書籍
    const bookId = 1;

    // When/Then: -2しようとするとエラー（CHECK制約）
    await expect(bookRepository.updateStock(bookId, -2))
      .rejects.toThrow(); // SQLite CHECK制約違反
  });
});
```

#### 5.1.2 テストカバレッジ目標

| レイヤー | カバレッジ目標 | 優先テスト対象 |
|---------|-------------|-------------|
| Service層 | 85%以上 | ビジネスロジック全般 |
| Repository層 | 80%以上 | CRUD操作、複雑なクエリ |
| Utils | 90%以上 | パスワードハッシュ、バリデーション |
| Middleware | 80%以上 | 認証・認可ロジック |

### 5.2 フロントエンド単体テスト

#### 5.2.1 Pinia ストアのテスト

```typescript
// tests/unit/stores/loans.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useLoansStore } from '@/stores/loans';
import * as loanService from '@/services/loanService';

vi.mock('@/services/loanService');

describe('LoansStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('borrowBook', () => {
    it('貸出成功時、myLoansを更新する', async () => {
      // Given
      const loansStore = useLoansStore();
      const mockLoan = {
        id: 10,
        book: { id: 2, title: 'Test Book' },
        status: 'borrowed'
      };

      vi.mocked(loanService.borrowBook).mockResolvedValue({
        data: { loan: mockLoan }
      });

      vi.mocked(loanService.getMyLoans).mockResolvedValue({
        data: {
          loans: [mockLoan],
          summary: { total_borrowed: 1, available_slots: 2 }
        }
      });

      // When
      const result = await loansStore.borrowBook(2);

      // Then
      expect(result).toBe(true);
      expect(loansStore.myLoans).toHaveLength(1);
      expect(loansStore.loanSummary?.available_slots).toBe(2);
    });

    it('エラー時、エラーメッセージを設定する', async () => {
      // Given
      const loansStore = useLoansStore();
      const errorMessage = '貸出上限に達しています';

      vi.mocked(loanService.borrowBook).mockRejectedValue({
        response: {
          data: {
            error: { message: errorMessage }
          }
        }
      });

      // When
      const result = await loansStore.borrowBook(2);

      // Then
      expect(result).toBe(false);
      expect(loansStore.error).toBe(errorMessage);
    });
  });

  describe('canBorrowMore', () => {
    it('available_slots > 0の場合、trueを返す', () => {
      const loansStore = useLoansStore();
      loansStore.loanSummary = {
        total_borrowed: 2,
        max_allowed: 3,
        available_slots: 1
      };

      expect(loansStore.canBorrowMore).toBe(true);
    });

    it('available_slots = 0の場合、falseを返す', () => {
      const loansStore = useLoansStore();
      loansStore.loanSummary = {
        total_borrowed: 3,
        max_allowed: 3,
        available_slots: 0
      };

      expect(loansStore.canBorrowMore).toBe(false);
    });
  });
});
```

#### 5.2.2 Composablesのテスト

```typescript
// tests/unit/composables/useDebounce.spec.ts
import { ref } from 'vue';
import { useDebounce } from '@/composables/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('指定時間内の複数呼び出しを1回にまとめる', () => {
    const searchValue = ref('');
    const mockCallback = vi.fn();

    const debouncedSearch = useDebounce(mockCallback, 300);

    // 連続して呼び出し
    searchValue.value = 'a';
    debouncedSearch(searchValue.value);

    searchValue.value = 'ab';
    debouncedSearch(searchValue.value);

    searchValue.value = 'abc';
    debouncedSearch(searchValue.value);

    // 300ms経過前は呼ばれない
    vi.advanceTimersByTime(299);
    expect(mockCallback).not.toHaveBeenCalled();

    // 300ms経過後、最後の値で1回だけ呼ばれる
    vi.advanceTimersByTime(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('abc');
  });
});
```

---

## 6. 統合テスト

### 6.1 API統合テスト

#### 6.1.1 貸出フロー統合テスト

```javascript
// tests/integration/api/loans.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { createTestDatabase, seedTestData } = require('../../setup/testDatabase');

describe('Loan API Integration Tests', () => {
  let db;
  let agent;
  let authCookie;

  beforeAll(async () => {
    db = await createTestDatabase();
    await seedTestData(db);
    agent = request.agent(app);

    // ログインしてセッションを取得
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'testuser1', password: 'test1234' });
    authCookie = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await db.close();
  });

  describe('POST /api/loans - 書籍を借りる', () => {
    it('在庫がある書籍を正常に借りられる', async () => {
      // Given: 在庫1の書籍
      const bookId = 2;

      // When: 貸出リクエスト
      const response = await agent
        .post('/api/loans')
        .set('Cookie', authCookie)
        .send({ book_id: bookId })
        .expect(201);

      // Then: 成功レスポンス
      expect(response.body.success).toBe(true);
      expect(response.body.data.loan).toHaveProperty('id');
      expect(response.body.data.loan.book_id).toBe(bookId);
      expect(response.body.data.loan.status).toBe('borrowed');

      // 在庫が減っているか確認
      const bookRes = await agent
        .get(`/api/books/${bookId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(bookRes.body.data.book.available_stock).toBe(0);
    });

    it('貸出上限に達している場合、409エラーを返す', async () => {
      // Given: 既に3冊借りているユーザ
      // (事前に3冊借りる処理)

      // When: 4冊目を借りようとする
      const response = await agent
        .post('/api/loans')
        .set('Cookie', authCookie)
        .send({ book_id: 5 })
        .expect(409);

      // Then: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOAN_LIMIT_EXCEEDED');
      expect(response.body.error.details.current_loans).toBe(3);
    });

    it('在庫0の書籍を借りようとすると409エラーを返す', async () => {
      // Given: 在庫0の書籍
      const bookId = 3;

      // When
      const response = await agent
        .post('/api/loans')
        .set('Cookie', authCookie)
        .send({ book_id: bookId })
        .expect(409);

      // Then
      expect(response.body.error.code).toBe('BOOK_NOT_AVAILABLE');
    });

    it('未認証ユーザは401エラーを返す', async () => {
      const response = await request(app)
        .post('/api/loans')
        .send({ book_id: 2 })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /api/loans/:id/return - 書籍を返却する', () => {
    let loanId;
    let bookId;

    beforeEach(async () => {
      // 貸出を作成
      bookId = 4;
      const loanRes = await agent
        .post('/api/loans')
        .set('Cookie', authCookie)
        .send({ book_id: bookId });
      loanId = loanRes.body.data.loan.id;
    });

    it('貸出中の書籍を正常に返却できる', async () => {
      // When: 返却リクエスト
      const response = await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', authCookie)
        .expect(200);

      // Then: 成功レスポンス
      expect(response.body.success).toBe(true);
      expect(response.body.data.loan.status).toBe('returned');
      expect(response.body.data.loan.return_date).not.toBeNull();

      // 在庫が増えているか確認
      const bookRes = await agent
        .get(`/api/books/${bookId}`)
        .set('Cookie', authCookie);

      expect(bookRes.body.data.book.available_stock).toBe(1);
    });

    it('既に返却済みの書籍は409エラーを返す', async () => {
      // Given: 返却済みにする
      await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', authCookie);

      // When: 再度返却しようとする
      const response = await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', authCookie)
        .expect(409);

      // Then
      expect(response.body.error.code).toBe('LOAN_ALREADY_RETURNED');
    });
  });

  describe('エンドツーエンドフロー', () => {
    it('貸出 → 返却 → 再貸出が正常に動作する', async () => {
      const bookId = 5;

      // Step 1: 貸出
      const loanRes = await agent
        .post('/api/loans')
        .set('Cookie', authCookie)
        .send({ book_id: bookId })
        .expect(201);

      const loanId = loanRes.body.data.loan.id;

      // Step 2: 在庫確認（0になっている）
      let bookRes = await agent
        .get(`/api/books/${bookId}`)
        .set('Cookie', authCookie);
      expect(bookRes.body.data.book.available_stock).toBe(0);

      // Step 3: 返却
      await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', authCookie)
        .expect(200);

      // Step 4: 在庫確認（1に戻っている）
      bookRes = await agent
        .get(`/api/books/${bookId}`)
        .set('Cookie', authCookie);
      expect(bookRes.body.data.book.available_stock).toBe(1);

      // Step 5: 再度貸出可能
      const reLoanRes = await agent
        .post('/api/loans')
        .set('Cookie', authCookie)
        .send({ book_id: bookId })
        .expect(201);

      expect(reLoanRes.body.success).toBe(true);
    });
  });
});
```

#### 6.1.2 認証フロー統合テスト

```javascript
// tests/integration/api/auth.test.js
describe('Auth API Integration Tests', () => {
  describe('ユーザ登録 → ログイン → ログアウト フロー', () => {
    it('完全な認証フローが正常に動作する', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        email: 'newuser@test.com'
      };

      // Step 1: ユーザ登録
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerRes.body.data.user.username).toBe(userData.username);

      // Step 2: ログイン
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Step 3: 認証が必要なエンドポイントにアクセス
      const agent = request.agent(app);
      await agent
        .get('/api/loans/my-loans')
        .set('Cookie', cookies)
        .expect(200);

      // Step 4: ログアウト
      await agent
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      // Step 5: ログアウト後はアクセス不可
      await agent
        .get('/api/loans/my-loans')
        .expect(401);
    });
  });

  describe('セッション管理', () => {
    it('セッション有効期限切れ後はアクセス不可', async () => {
      // Given: ログイン
      const agent = request.agent(app);
      const loginRes = await agent
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test1234' });

      // When: 30分経過（セッションタイムアウト）
      // 時間を進める（実際のテストではモック時刻を使用）
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);

      // Then: アクセス不可
      await agent
        .get('/api/loans/my-loans')
        .expect(401);
    });
  });
});
```

### 6.2 データベース統合テスト

```javascript
// tests/integration/database/transactions.test.js
describe('Transaction Tests', () => {
  it('貸出処理中のエラーでロールバックされる', async () => {
    // Given
    const userId = 1;
    const bookId = 2;
    const initialStock = await getBookStock(bookId);

    // When: 在庫減少後、エラーを起こす
    // (モックでloanRepositoryのcreateをエラーにする)

    try {
      await loanService.createLoan(userId, bookId);
    } catch (error) {
      // エラーが発生
    }

    // Then: 在庫は元に戻っている（ロールバック）
    const currentStock = await getBookStock(bookId);
    expect(currentStock).toBe(initialStock);
  });

  it('同時貸出時、在庫が正しく管理される', async () => {
    // Given: 在庫1の書籍
    const bookId = 3;
    const user1 = 1;
    const user2 = 2;

    // When: 2人が同時に借りようとする
    const results = await Promise.allSettled([
      loanService.createLoan(user1, bookId),
      loanService.createLoan(user2, bookId)
    ]);

    // Then: 1人だけ成功する
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBe(1);

    // 在庫は0
    const book = await bookRepository.findById(bookId);
    expect(book.available_stock).toBe(0);
  });
});
```

---

## 7. E2Eテスト

### 7.1 主要ユーザジャーニー

#### 7.1.1 一般ユーザフロー

```typescript
// tests/e2e/user-loan-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('一般ユーザ: 書籍貸出・返却フロー', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'test1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:5173/books');
  });

  test('書籍を検索して借りる', async ({ page }) => {
    // Step 1: 書籍一覧ページで検索
    await page.fill('input[placeholder*="検索"]', 'Clean Code');
    await page.click('button:has-text("検索")');

    // Step 2: 検索結果を確認
    await expect(page.locator('.book-card')).toContainText('Clean Code');

    // Step 3: 書籍を借りる
    await page.click('.book-card:has-text("Clean Code") button:has-text("借りる")');

    // Step 4: 成功メッセージを確認
    await expect(page.locator('.toast-success')).toContainText('書籍を借りました');

    // Step 5: 貸出状況ページに移動
    await page.click('a:has-text("貸出状況")');
    await expect(page).toHaveURL('http://localhost:5173/my-loans');

    // Step 6: 借りた書籍が表示される
    await expect(page.locator('.loan-card')).toContainText('Clean Code');
    await expect(page.locator('.loan-summary')).toContainText('貸出中: 1冊');
  });

  test('借りている書籍を返却する', async ({ page }) => {
    // Given: 既に借りている状態
    await page.goto('http://localhost:5173/my-loans');

    // When: 返却ボタンをクリック
    await page.click('.loan-card:first-child button:has-text("返却する")');

    // Then: 確認ダイアログが表示される
    await page.click('button:has-text("はい、返却します")');

    // 成功メッセージ
    await expect(page.locator('.toast-success')).toContainText('書籍を返却しました');

    // 貸出中の書籍が減る
    await expect(page.locator('.loan-summary')).toContainText('貸出中: 0冊');
  });

  test('貸出上限（3冊）を超えて借りようとするとエラーになる', async ({ page }) => {
    // Given: 既に3冊借りている状態（事前準備）

    // When: 4冊目を借りようとする
    await page.goto('http://localhost:5173/books');
    await page.click('.book-card:first-child button:has-text("借りる")');

    // Then: エラーメッセージが表示される
    await expect(page.locator('.alert-danger')).toContainText('貸出上限（3冊）に達しています');
  });

  test('在庫0の書籍は借りるボタンが無効化されている', async ({ page }) => {
    // Given: 在庫0の書籍を表示
    await page.goto('http://localhost:5173/books');

    // When: 在庫0の書籍カードを確認
    const unavailableBook = page.locator('.book-card:has(.badge:has-text("在庫: 0"))');

    // Then: 借りるボタンが無効化されている
    await expect(unavailableBook.locator('button:has-text("借りる")')).toBeDisabled();
  });
});
```

#### 7.1.2 管理者フロー

```typescript
// tests/e2e/admin-management.spec.ts
test.describe('管理者: 書籍管理フロー', () => {
  test.beforeEach(async ({ page }) => {
    // 管理者でログイン
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.click('a:has-text("管理画面")');
  });

  test('新しい書籍を登録する', async ({ page }) => {
    // Step 1: 書籍管理ページに移動
    await page.click('a:has-text("書籍管理")');
    await expect(page).toHaveURL(/\/admin\/books/);

    // Step 2: 新規登録ボタンをクリック
    await page.click('button:has-text("新規登録")');

    // Step 3: フォームに入力
    await page.fill('input[name="isbn"]', '978-4-295-00712-7');
    await page.fill('input[name="title"]', 'リーダブルコード');
    await page.fill('input[name="author"]', 'Dustin Boswell');
    await page.fill('input[name="publisher"]', 'オライリー・ジャパン');
    await page.fill('input[name="published_year"]', '2012');
    await page.selectOption('select[name="category"]', '技術書');
    await page.fill('input[name="total_stock"]', '2');

    // Step 4: 登録ボタンをクリック
    await page.click('button[type="submit"]:has-text("登録")');

    // Step 5: 成功メッセージと一覧に追加されたことを確認
    await expect(page.locator('.toast-success')).toContainText('書籍を登録しました');
    await expect(page.locator('.book-table')).toContainText('リーダブルコード');
  });

  test('既存の書籍情報を更新する', async ({ page }) => {
    // Step 1: 編集ボタンをクリック
    await page.click('a:has-text("書籍管理")');
    await page.click('.book-table tr:first-child button:has-text("編集")');

    // Step 2: 在庫数を変更
    await page.fill('input[name="total_stock"]', '3');

    // Step 3: 更新ボタンをクリック
    await page.click('button[type="submit"]:has-text("更新")');

    // Step 4: 成功メッセージ
    await expect(page.locator('.toast-success')).toContainText('書籍情報を更新しました');
  });

  test('貸出中の書籍は削除できない', async ({ page }) => {
    // Given: 貸出中の書籍
    await page.click('a:has-text("書籍管理")');

    // When: 削除ボタンをクリック
    await page.click('.book-table tr:has-text("貸出中") button:has-text("削除")');
    await page.click('button:has-text("はい、削除します")');

    // Then: エラーメッセージ
    await expect(page.locator('.alert-danger')).toContainText('貸出中のため削除できません');
  });
});
```

### 7.2 視覚回帰テスト

```typescript
// tests/e2e/visual-regression.spec.ts
test.describe('Visual Regression Tests', () => {
  test('書籍一覧ページのスクリーンショット', async ({ page }) => {
    await page.goto('http://localhost:5173/books');
    await expect(page).toHaveScreenshot('books-list.png');
  });

  test('貸出状況ページのスクリーンショット', async ({ page }) => {
    // ログイン後
    await page.goto('http://localhost:5173/my-loans');
    await expect(page).toHaveScreenshot('my-loans.png');
  });
});
```

### 7.3 アクセシビリティテスト

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test('書籍一覧ページにアクセシビリティ違反がないこと', async ({ page }) => {
    await page.goto('http://localhost:5173/books');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('キーボードナビゲーションが動作すること', async ({ page }) => {
    await page.goto('http://localhost:5173/books');

    // Tabキーで移動
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('href', '/books');

    // Enterキーでクリック
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/books/);
  });
});
```

---

## 8. API自動テスト

### 8.1 全エンドポイント網羅テスト

```javascript
// tests/api/endpoints-coverage.test.js
describe('API Endpoints Coverage', () => {
  const endpoints = [
    // 認証
    { method: 'POST', path: '/api/auth/register', auth: false },
    { method: 'POST', path: '/api/auth/login', auth: false },
    { method: 'POST', path: '/api/auth/logout', auth: true },
    { method: 'GET', path: '/api/auth/me', auth: true },

    // ユーザ
    { method: 'GET', path: '/api/users', auth: true, admin: true },
    { method: 'GET', path: '/api/users/:id', auth: true },
    { method: 'PUT', path: '/api/users/:id', auth: true },
    { method: 'DELETE', path: '/api/users/:id', auth: true, admin: true },

    // 書籍
    { method: 'GET', path: '/api/books', auth: true },
    { method: 'GET', path: '/api/books/:id', auth: true },
    { method: 'POST', path: '/api/books', auth: true, admin: true },
    { method: 'PUT', path: '/api/books/:id', auth: true, admin: true },
    { method: 'DELETE', path: '/api/books/:id', auth: true, admin: true },
    { method: 'GET', path: '/api/books/categories', auth: true },

    // 貸出
    { method: 'GET', path: '/api/loans', auth: true },
    { method: 'GET', path: '/api/loans/my-loans', auth: true },
    { method: 'GET', path: '/api/loans/overdue', auth: true, admin: true },
    { method: 'POST', path: '/api/loans', auth: true },
    { method: 'PUT', path: '/api/loans/:id/return', auth: true }
  ];

  endpoints.forEach(endpoint => {
    describe(`${endpoint.method} ${endpoint.path}`, () => {
      it('正常系: 200/201レスポンスを返す', async () => {
        // テスト実装
      });

      if (endpoint.auth) {
        it('異常系: 未認証の場合401エラー', async () => {
          // テスト実装
        });
      }

      if (endpoint.admin) {
        it('異常系: 一般ユーザの場合403エラー', async () => {
          // テスト実装
        });
      }

      it('異常系: 不正なパラメータで400エラー', async () => {
        // テスト実装
      });
    });
  });
});
```

### 8.2 APIコントラクトテスト

```javascript
// tests/api/contract.test.js
describe('API Contract Tests', () => {
  describe('GET /api/books/:id レスポンス形式', () => {
    it('正しいスキーマに準拠する', async () => {
      const response = await request(app)
        .get('/api/books/1')
        .set('Cookie', authCookie)
        .expect(200);

      // スキーマ検証
      expect(response.body).toMatchSchema({
        success: true,
        data: {
          book: {
            id: expect.any(Number),
            isbn: expect.any(String),
            title: expect.any(String),
            author: expect.any(String),
            publisher: expect.stringOrNull(),
            published_year: expect.numberOrNull(),
            category: expect.stringOrNull(),
            total_stock: expect.any(Number),
            available_stock: expect.any(Number),
            created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
            updated_at: expect.stringOrNull()
          }
        }
      });
    });
  });

  describe('エラーレスポンス形式の統一性', () => {
    it('すべてのエラーが共通フォーマット', async () => {
      const responses = await Promise.all([
        request(app).post('/api/loans').send({ book_id: 999 }), // 404
        request(app).post('/api/auth/login').send({ username: 'x' }), // 400
        request(app).get('/api/users').expect(401) // 401
      ]);

      responses.forEach(res => {
        expect(res.body).toMatchObject({
          success: false,
          error: {
            code: expect.any(String),
            message: expect.any(String)
          }
        });
      });
    });
  });
});
```

---

## 9. パフォーマンステスト

### 9.1 負荷テスト設定

```yaml
# tests/performance/load-test.yml (Artillery)
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "書籍検索シナリオ"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            username: "loadtest{{ $randomNumber(1, 100) }}"
            password: "test1234"
          capture:
            - json: "$.data.user.id"
              as: "userId"

      - get:
          url: "/api/books?page=1&limit=20"
          expect:
            - statusCode: 200
            - contentType: "application/json"

      - get:
          url: "/api/books?search=Clean&availableOnly=true"
          expect:
            - statusCode: 200

      - think: 2

      - post:
          url: "/api/loans"
          json:
            book_id: "{{ $randomNumber(1, 50) }}"

  - name: "貸出・返却シナリオ"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            username: "testuser{{ $randomNumber(1, 50) }}"
            password: "test1234"

      - get:
          url: "/api/loans/my-loans"

      - post:
          url: "/api/loans"
          json:
            book_id: "{{ $randomNumber(1, 100) }}"

      - think: 5

      - put:
          url: "/api/loans/{{ loanId }}/return"
```

**実行コマンド**:
```bash
npm install -g artillery
artillery run tests/performance/load-test.yml
```

### 9.2 パフォーマンス目標

| 指標 | 目標値 | 計測方法 |
|-----|-------|---------|
| API平均レスポンスタイム | <200ms | Artillery レポート |
| API 95パーセンタイル | <500ms | Artillery レポート |
| 同時接続数 | 50ユーザ対応 | 負荷テスト |
| データベースクエリ時間 | <50ms | SQLite EXPLAIN QUERY PLAN |
| フロントエンド初期表示 | <2秒 | Lighthouse |

### 9.3 ボトルネック検出テスト

```javascript
// tests/performance/bottleneck.test.js
describe('Performance Bottleneck Tests', () => {
  it('複雑な検索クエリのパフォーマンス', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/api/books?search=code&category=技術書&availableOnly=true')
      .set('Cookie', authCookie)
      .expect(200);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(200); // 200ms以内
  });

  it('大量データでのページネーション', async () => {
    // Given: 1000件の書籍データ
    // When: 最終ページを取得
    const startTime = Date.now();

    await request(app)
      .get('/api/books?page=50&limit=20')
      .set('Cookie', authCookie)
      .expect(200);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(300);
  });

  it('同時貸出処理のパフォーマンス', async () => {
    // 10人が同時に借りる
    const promises = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/loans')
        .set('Cookie', userCookies[i])
        .send({ book_id: i + 1 })
    );

    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // 1秒以内
  });
});
```

---

## 10. セキュリティテスト

### 10.1 認証・認可テスト

```javascript
// tests/security/authentication.test.js
describe('Authentication Security Tests', () => {
  describe('パスワードセキュリティ', () => {
    it('弱いパスワードは拒否される', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: '12345',
          email: 'test@test.com'
        })
        .expect(400);

      expect(response.body.error.message).toMatch(/パスワードは8文字以上/);
    });

    it('ユーザ名と同じパスワードは拒否される', async () => {
      // テスト実装
    });

    it('パスワードはハッシュ化されて保存される', async () => {
      // DB直接確認
      const user = await userRepository.findByUsername('testuser');
      expect(user.password_hash).not.toBe('test1234');
      expect(user.password_hash).toMatch(/^\$2[ayb]\$.{56}$/); // bcryptフォーマット
    });
  });

  describe('セッション管理', () => {
    it('ログアウト後はセッションが無効になる', async () => {
      const agent = request.agent(app);

      // ログイン
      await agent
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test1234' });

      // アクセス可能
      await agent.get('/api/loans/my-loans').expect(200);

      // ログアウト
      await agent.post('/api/auth/logout').expect(200);

      // アクセス不可
      await agent.get('/api/loans/my-loans').expect(401);
    });

    it('セッション固定攻撃対策: ログイン時にセッションIDが変わる', async () => {
      const agent = request.agent(app);

      // 初回アクセスでセッションID取得
      await agent.get('/api/auth/me').expect(401);
      const sessionId1 = extractSessionId(agent);

      // ログイン
      await agent
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test1234' });

      const sessionId2 = extractSessionId(agent);

      // セッションIDが変わっている
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('権限チェック', () => {
    it('一般ユーザは管理者APIにアクセスできない', async () => {
      // 一般ユーザでログイン
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test1234' });

      // 管理者専用エンドポイントにアクセス
      await agent.get('/api/users').expect(403);
      await agent.post('/api/books').send({ title: 'test' }).expect(403);
    });

    it('他のユーザの貸出情報にアクセスできない', async () => {
      // User1でログイン
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ username: 'testuser1', password: 'test1234' });

      // User2の貸出を返却しようとする
      await agent.put('/api/loans/999/return').expect(403);
    });
  });
});
```

### 10.2 入力検証テスト

```javascript
// tests/security/input-validation.test.js
describe('Input Validation Security Tests', () => {
  describe('SQLインジェクション対策', () => {
    it('SQLインジェクションは無効化される', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      // ユーザ名に注入を試みる
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: maliciousInput,
          password: 'test'
        })
        .expect(401); // ログイン失敗（SQLエラーではない）

      // usersテーブルが存在することを確認
      const users = await userRepository.findAll({});
      expect(users.users.length).toBeGreaterThan(0);
    });

    it('検索クエリでのSQLインジェクションも無効化', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test1234' });

      await agent
        .get('/api/books?search=' + encodeURIComponent("' OR 1=1 --"))
        .expect(200); // 正常なレスポンス（エラーではない）
    });
  });

  describe('XSS対策', () => {
    it('スクリプトタグを含む入力はエスケープされる', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const maliciousTitle = '<script>alert("XSS")</script>';

      const response = await agent
        .post('/api/books')
        .send({
          isbn: '978-0-000-00000-0',
          title: maliciousTitle,
          author: 'Test',
          total_stock: 1
        })
        .expect(201);

      // 保存されたデータを確認（エスケープされている）
      const book = response.body.data.book;
      expect(book.title).not.toContain('<script>');
    });
  });

  describe('バリデーションバイパス対策', () => {
    it('在庫数の上限（3冊）を超える値は拒否される', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      await agent
        .post('/api/books')
        .send({
          isbn: '978-0-000-00000-0',
          title: 'Test Book',
          author: 'Test',
          total_stock: 10 // 上限超過
        })
        .expect(400); // バリデーションエラー
    });

    it('負の在庫数は拒否される', async () => {
      // テスト実装
    });
  });
});
```

### 10.3 レート制限テスト

```javascript
// tests/security/rate-limiting.test.js
describe('Rate Limiting Tests', () => {
  it('ログインエンドポイントのレート制限', async () => {
    const attempts = [];

    // 5回連続でログイン試行
    for (let i = 0; i < 5; i++) {
      attempts.push(
        request(app)
          .post('/api/auth/login')
          .send({ username: 'testuser', password: 'wrongpassword' })
      );
    }

    const responses = await Promise.all(attempts);

    // 最初の5回は401（認証失敗）
    responses.forEach(res => expect(res.status).toBe(401));

    // 6回目は429（レート制限）
    const sixthAttempt = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'test1234' });

    expect(sixthAttempt.status).toBe(429);
    expect(sixthAttempt.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('一般APIのレート制限', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'test1234' });

    // 100回連続リクエスト
    const requests = [];
    for (let i = 0; i < 101; i++) {
      requests.push(agent.get('/api/books'));
    }

    const responses = await Promise.all(requests);

    // 101回目は429
    expect(responses[100].status).toBe(429);
  });
});
```

---

## 11. テストデータ戦略

### 11.1 テストデータ分類

| データ種類 | 用途 | 管理方法 |
|-----------|------|---------|
| マスタデータ | 基本的なユーザ・書籍 | SQL Seed ファイル |
| シナリオデータ | 特定のテストケース用 | テストコード内で生成 |
| ランダムデータ | 境界値・エッジケース | Faker.js で生成 |
| 本番類似データ | パフォーマンステスト | スクリプトで大量生成 |

### 11.2 テストデータ生成

```javascript
// tests/fixtures/dataGenerator.js
const { faker } = require('@faker-js/faker');

/**
 * テストユーザを生成
 */
function generateTestUser(overrides = {}) {
  return {
    username: faker.internet.userName(),
    password: 'Test1234!',
    email: faker.internet.email(),
    role: 'user',
    ...overrides
  };
}

/**
 * テスト書籍を生成
 */
function generateTestBook(overrides = {}) {
  return {
    isbn: faker.commerce.isbn(13),
    title: faker.commerce.productName(),
    author: faker.person.fullName(),
    publisher: faker.company.name(),
    published_year: faker.date.past({ years: 20 }).getFullYear(),
    category: faker.helpers.arrayElement(['技術書', 'ビジネス書', '小説']),
    total_stock: faker.number.int({ min: 1, max: 3 }),
    available_stock: faker.number.int({ min: 0, max: 3 }),
    ...overrides
  };
}

/**
 * 境界値テスト用データセット
 */
function generateBoundaryTestData() {
  return {
    books: [
      // 在庫パターン
      generateTestBook({ available_stock: 0 }), // 在庫0
      generateTestBook({ available_stock: 1 }), // 在庫1
      generateTestBook({ available_stock: 3 }), // 在庫3（最大）

      // タイトル長さ
      generateTestBook({ title: 'A' }), // 最短
      generateTestBook({ title: 'A'.repeat(200) }), // 最長

      // 出版年
      generateTestBook({ published_year: 1900 }), // 最古
      generateTestBook({ published_year: new Date().getFullYear() }) // 最新
    ],
    users: [
      // 貸出数パターン
      generateTestUser(), // 0冊借りている
      generateTestUser(), // 1冊借りている（事前準備必要）
      generateTestUser(), // 2冊借りている
      generateTestUser()  // 3冊借りている（上限）
    ]
  };
}

/**
 * 大量データ生成（パフォーマンステスト用）
 */
function generateLargeDataset(counts = { users: 100, books: 500, loans: 200 }) {
  const users = Array.from({ length: counts.users }, () => generateTestUser());
  const books = Array.from({ length: counts.books }, () => generateTestBook());
  const loans = []; // 貸出データ生成ロジック

  return { users, books, loans };
}

module.exports = {
  generateTestUser,
  generateTestBook,
  generateBoundaryTestData,
  generateLargeDataset
};
```

### 11.3 テストデータクリーンアップ

```javascript
// tests/setup/teardown.js
async function cleanupTestData(db) {
  // テストデータの削除
  await db.runAsync('DELETE FROM loans WHERE user_id IN (SELECT id FROM users WHERE username LIKE "test%")');
  await db.runAsync('DELETE FROM books WHERE isbn LIKE "978-0-000%"');
  await db.runAsync('DELETE FROM users WHERE username LIKE "test%"');
}

// Jest グローバルセットアップ
afterEach(async () => {
  await cleanupTestData(testDb);
});
```

---

## 12. CI/CD統合

### 12.1 GitHub Actions ワークフロー

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: |
          cd server
          npm ci

      - name: Lint
        run: |
          cd server
          npm run lint

      - name: Unit Tests
        run: |
          cd server
          npm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/lcov.info
          flags: backend

      - name: Integration Tests
        run: |
          cd server
          npm run test:integration

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x

      - name: Install dependencies
        run: |
          cd client
          npm ci

      - name: Lint
        run: |
          cd client
          npm run lint

      - name: Type Check
        run: |
          cd client
          npm run type-check

      - name: Unit Tests
        run: |
          cd client
          npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./client/coverage/lcov.info
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x

      - name: Install dependencies
        run: |
          cd server && npm ci
          cd ../client && npm ci

      - name: Initialize database
        run: |
          cd server
          npm run db:init
          npm run db:seed

      - name: Start backend
        run: |
          cd server
          npm start &
          sleep 5

      - name: Start frontend
        run: |
          cd client
          npm run dev &
          sleep 5

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E Tests
        run: |
          cd client
          npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: client/playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18.x

      - name: Install Artillery
        run: npm install -g artillery@latest

      - name: Start server
        run: |
          cd server
          npm ci
          npm run db:init
          npm run db:seed
          npm start &
          sleep 10

      - name: Run load tests
        run: |
          artillery run tests/performance/load-test.yml --output report.json

      - name: Generate HTML report
        run: |
          artillery report report.json --output report.html

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: report.html
```

### 12.2 テストステージ定義

```yaml
# CI/CDパイプライン構成
stages:
  - name: "Static Analysis"
    jobs:
      - lint (backend)
      - lint (frontend)
      - type-check (frontend)

  - name: "Unit Tests"
    jobs:
      - backend-unit-tests
      - frontend-unit-tests
    parallel: true

  - name: "Integration Tests"
    jobs:
      - api-integration-tests
      - database-integration-tests

  - name: "E2E Tests"
    jobs:
      - user-journey-tests
      - admin-journey-tests

  - name: "Performance Tests"
    trigger: "on main branch only"
    jobs:
      - load-tests

  - name: "Security Tests"
    trigger: "on main branch only"
    jobs:
      - security-scan
      - dependency-audit
```

---

## 13. テスト実行計画

### 13.1 開発フェーズ別実行計画

| フェーズ | テスト種類 | 実行タイミング | 所要時間 |
|---------|-----------|-------------|---------|
| 開発中 | 単体テスト | ファイル保存時（ウォッチモード） | ~1秒 |
| コミット前 | 単体テスト + Lint | Git pre-commit フック | ~30秒 |
| PR作成時 | 単体 + 統合 + API | CI/CD自動実行 | ~5分 |
| マージ前 | 全テスト（E2E含む） | CI/CD自動実行 | ~15分 |
| デプロイ前 | 全テスト + パフォーマンス | CI/CD自動実行 | ~20分 |
| 定期実行 | セキュリティ + パフォーマンス | 夜間バッチ | ~30分 |

### 13.2 テスト実行コマンド

```bash
# バックエンド
cd server

# 単体テスト
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# 統合テスト
npm run test:integration

# フロントエンド
cd client

# 単体テスト
npm run test:unit

# E2Eテスト
npm run test:e2e

# E2Eテスト（ヘッドレス）
npm run test:e2e:headless

# 型チェック
npm run type-check

# 全体
# ルートディレクトリから
npm run test:all
```

### 13.3 優先度別実行戦略

**P0 (必須 - 毎回実行)**:
- バックエンド単体テスト
- フロントエンド単体テスト
- クリティカルパスのE2E（ログイン、貸出、返却）

**P1 (重要 - PR時実行)**:
- 統合テスト
- 全E2Eテスト
- APIカバレッジテスト

**P2 (推奨 - デプロイ前実行)**:
- パフォーマンステスト
- セキュリティテスト
- 視覚回帰テスト

**P3 (定期実行)**:
- 大量データ負荷テスト
- ストレステスト
- セキュリティスキャン

---

## 14. 品質メトリクス

### 14.1 測定指標

| メトリクス | 目標値 | 現在値 | トレンド |
|-----------|-------|-------|---------|
| 単体テストカバレッジ | 80% | - | - |
| 統合テストカバレッジ | 70% | - | - |
| E2Eテスト成功率 | 95% | - | - |
| バグ検出率（リリース前） | 90% | - | - |
| 平均修正時間 | <2日 | - | - |
| テスト実行時間 | <15分 | - | - |

### 14.2 品質ゲート

**リリース条件**:
- ✅ 全単体テスト成功
- ✅ 全統合テスト成功
- ✅ クリティカルE2E成功率 100%
- ✅ コードカバレッジ ≥ 80%
- ✅ セキュリティテスト クリティカル問題0件
- ✅ パフォーマンステスト 目標値達成
- ✅ コードレビュー承認

### 14.3 継続的改善

**週次レビュー**:
- フレーキーテストの特定と修正
- テスト実行時間の最適化
- カバレッジギャップの分析

**月次レビュー**:
- テスト戦略の見直し
- 新規テストケースの追加
- テストデータのメンテナンス

**四半期レビュー**:
- テスト自動化ROIの評価
- ツール・フレームワークの更新
- テストインフラの改善

---

## 付録

### A. テスト環境構築手順

```bash
# バックエンドテスト環境
cd server
npm install
npm run db:init
npm run db:seed
npm test

# フロントエンドテスト環境
cd client
npm install
npm run test:unit

# E2E環境
npx playwright install
npm run test:e2e
```

### B. トラブルシューティング

#### テストが失敗する場合

**問題: データベースロック**
```
Error: SQLITE_BUSY: database is locked
```
**解決策**: テスト用にインメモリDBを使用する
```javascript
const db = new sqlite3.Database(':memory:');
```

**問題: E2Eテストのタイムアウト**
```
Error: Test timeout of 30000ms exceeded
```
**解決策**: タイムアウト時間を延長、またはwaitForを適切に使用
```typescript
test('example', async ({ page }) => {
  await page.waitForSelector('.element', { timeout: 10000 });
});
```

### C. 参考リソース

- [Jest 公式ドキュメント](https://jestjs.io/)
- [Vitest 公式ドキュメント](https://vitest.dev/)
- [Playwright 公式ドキュメント](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Artillery.io](https://www.artillery.io/)

---

**次のステップ**:
1. テストケース詳細設計書の作成
2. 自動テストコードの実装
3. CI/CDパイプラインの構築
4. テスト実行と品質メトリクス収集

**作成者**: Quality Engineer
**レビュー**: Backend Architect, Frontend Architect
**承認**: Project Manager
