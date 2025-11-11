# テストデータ設計書

**作成日**: 2025-01-11
**バージョン**: 1.0
**関連文書**: TEST_STRATEGY.md, TEST_CASES.md, CI_CD_GUIDE.md

---

## 目次

1. [テストデータ戦略概要](#1-テストデータ戦略概要)
2. [データ分類とライフサイクル](#2-データ分類とライフサイクル)
3. [単体テスト用データ](#3-単体テスト用データ)
4. [統合テスト用データ](#4-統合テスト用データ)
5. [E2Eテスト用データ](#5-e2eテスト用データ)
6. [パフォーマンステスト用データ](#6-パフォーマンステスト用データ)
7. [データ生成ユーティリティ](#7-データ生成ユーティリティ)
8. [データクリーンアップ戦略](#8-データクリーンアップ戦略)

---

## 1. テストデータ戦略概要

### 設計原則

**1. 独立性**: 各テストは独立したデータセットで実行可能
**2. 再現性**: 同じデータで何度でも同じ結果を得られる
**3. 包括性**: エッジケースと境界値を含む
**4. リアリズム**: 本番に近いデータ特性を保持
**5. 保守性**: データ生成ロジックを一元管理

### データソース階層

```
マスタデータ (Schema + Seed)
    ↓
テストフィクスチャ (Static JSON)
    ↓
動的生成データ (Faker.js)
    ↓
シナリオ特化データ (Test-specific)
```

---

## 2. データ分類とライフサイクル

### データ分類

| 分類 | 用途 | 管理方法 | 生存期間 |
|------|------|---------|---------|
| **マスタデータ** | 基本的なユーザ・書籍 | SQL Seedファイル | 永続 |
| **フィクスチャ** | 標準テストケース用 | JSON/YAML | 永続 |
| **動的データ** | ランダム性が必要 | Faker.js | テスト実行時 |
| **一時データ** | テスト中のみ必要 | In-memory生成 | テスト終了時削除 |
| **大量データ** | パフォーマンステスト用 | スクリプト生成 | テスト終了時削除 |

### ライフサイクル管理

```
Before All Tests:
    ├─ データベーススキーマ作成
    ├─ マスタデータ投入
    └─ フィクスチャ読み込み

Before Each Test:
    ├─ テスト固有データ生成
    └─ データベースクリーン状態確認

After Each Test:
    ├─ 一時データ削除
    └─ トランザクションロールバック

After All Tests:
    └─ テストデータベース削除
```

---

## 3. 単体テスト用データ

### データ要件

- **軽量**: 最小限のデータ量
- **モック**: 外部依存をモック化
- **境界値**: エッジケースを明示的にカバー

### ユーザデータ

#### 基本ユーザパターン

```javascript
// tests/fixtures/users.js
const testUsers = {
  // 一般ユーザ (貸出数パターン)
  userWithNoLoans: {
    id: 1,
    username: 'user_no_loans',
    email: 'no_loans@test.com',
    role: 'user',
    current_loans: 0
  },

  userWith1Loan: {
    id: 2,
    username: 'user_1_loan',
    email: '1_loan@test.com',
    role: 'user',
    current_loans: 1
  },

  userWith2Loans: {
    id: 3,
    username: 'user_2_loans',
    email: '2_loans@test.com',
    role: 'user',
    current_loans: 2
  },

  userWith3Loans: {
    id: 4,
    username: 'user_3_loans',
    email: '3_loans@test.com',
    role: 'user',
    current_loans: 3  // 上限
  },

  // 管理者
  adminUser: {
    id: 100,
    username: 'admin_test',
    email: 'admin@test.com',
    role: 'admin',
    current_loans: 0
  }
};

module.exports = { testUsers };
```

### 書籍データ

#### 在庫パターン

```javascript
// tests/fixtures/books.js
const testBooks = {
  // 在庫パターン
  bookWithStock1: {
    id: 1,
    isbn: '978-4-295-00001-1',
    title: 'Test Book 1',
    author: 'Test Author',
    publisher: 'Test Publisher',
    published_year: 2020,
    category: '技術書',
    total_stock: 1,
    available_stock: 1
  },

  bookWithStock0: {
    id: 2,
    isbn: '978-4-295-00002-2',
    title: 'Test Book 2 (Out of Stock)',
    author: 'Test Author',
    publisher: 'Test Publisher',
    published_year: 2021,
    category: '技術書',
    total_stock: 1,
    available_stock: 0
  },

  bookWithStock3: {
    id: 3,
    isbn: '978-4-295-00003-3',
    title: 'Test Book 3',
    author: 'Test Author',
    publisher: 'Test Publisher',
    published_year: 2022,
    category: '技術書',
    total_stock: 3,
    available_stock: 3
  },

  // 境界値テスト用
  bookMinTitle: {
    id: 10,
    isbn: '978-4-295-00010-0',
    title: 'A',  // 最短タイトル
    author: 'Test',
    total_stock: 1,
    available_stock: 1
  },

  bookMaxTitle: {
    id: 11,
    isbn: '978-4-295-00011-1',
    title: 'A'.repeat(200),  // 最長タイトル (200文字)
    author: 'Test',
    total_stock: 1,
    available_stock: 1
  }
};

module.exports = { testBooks };
```

### 貸出データ

#### 貸出状態パターン

```javascript
// tests/fixtures/loans.js
const testLoans = {
  activeLoan: {
    id: 1,
    user_id: 1,
    book_id: 1,
    loan_date: '2025-01-11T10:00:00Z',
    due_date: '2025-01-25T10:00:00Z',  // 14日後
    return_date: null,
    status: 'borrowed'
  },

  returnedLoan: {
    id: 2,
    user_id: 1,
    book_id: 2,
    loan_date: '2025-01-01T10:00:00Z',
    due_date: '2025-01-15T10:00:00Z',
    return_date: '2025-01-14T15:30:00Z',
    status: 'returned'
  },

  overdueLoan: {
    id: 3,
    user_id: 2,
    book_id: 3,
    loan_date: '2024-12-15T10:00:00Z',
    due_date: '2024-12-29T10:00:00Z',  // 過去の日付
    return_date: null,
    status: 'overdue'
  },

  nearDueLoan: {
    id: 4,
    user_id: 3,
    book_id: 4,
    loan_date: '2025-01-09T10:00:00Z',
    due_date: '2025-01-12T10:00:00Z',  // 3日以内
    return_date: null,
    status: 'borrowed'
  }
};

module.exports = { testLoans };
```

---

## 4. 統合テスト用データ

### データ要件

- **実DB**: SQLite in-memory データベース使用
- **トランザクション**: テスト間の独立性確保
- **リアリスティック**: 実際の使用パターンを模倣

### データベースシードファイル

```javascript
// tests/setup/seed-integration.js
const bcrypt = require('bcrypt');

async function seedIntegrationData(db) {
  // ユーザデータ
  const users = [
    {
      username: 'testuser',
      password_hash: await bcrypt.hash('user1234', 10),
      email: 'testuser@test.com',
      role: 'user'
    },
    {
      username: 'testadmin',
      password_hash: await bcrypt.hash('admin123', 10),
      email: 'testadmin@test.com',
      role: 'admin'
    },
    {
      username: 'testuser2',
      password_hash: await bcrypt.hash('user5678', 10),
      email: 'testuser2@test.com',
      role: 'user'
    }
  ];

  for (const user of users) {
    await db.run(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [user.username, user.password_hash, user.email, user.role]
    );
  }

  // 書籍データ (様々な在庫パターン)
  const books = [
    {
      isbn: '978-4-295-00001-1',
      title: 'リーダブルコード',
      author: 'Dustin Boswell',
      publisher: 'オライリー・ジャパン',
      published_year: 2012,
      category: '技術書',
      total_stock: 1,
      available_stock: 1
    },
    {
      isbn: '978-4-295-00002-2',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      published_year: 2008,
      category: '技術書',
      total_stock: 1,
      available_stock: 0  // 在庫切れ
    },
    {
      isbn: '978-4-295-00003-3',
      title: 'Design Patterns',
      author: 'Gang of Four',
      publisher: 'Addison-Wesley',
      published_year: 1994,
      category: '技術書',
      total_stock: 2,
      available_stock: 2
    },
    {
      isbn: '978-4-295-00004-4',
      title: 'The Pragmatic Programmer',
      author: 'Andrew Hunt',
      publisher: 'Addison-Wesley',
      published_year: 1999,
      category: '技術書',
      total_stock: 3,
      available_stock: 3
    },
    {
      isbn: '978-4-295-00005-5',
      title: '7つの習慣',
      author: 'Stephen R. Covey',
      publisher: 'キングベアー出版',
      published_year: 1996,
      category: 'ビジネス書',
      total_stock: 2,
      available_stock: 1
    }
  ];

  for (const book of books) {
    await db.run(
      'INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [book.isbn, book.title, book.author, book.publisher, book.published_year, book.category, book.total_stock, book.available_stock]
    );
  }
}

module.exports = { seedIntegrationData };
```

### テストシナリオ用データセット

```javascript
// tests/scenarios/loan-limit-scenario.js
const loanLimitScenario = {
  description: '貸出上限3冊のテストシナリオ',

  users: [
    { username: 'user_boundary_test', email: 'boundary@test.com', role: 'user' }
  ],

  books: [
    { isbn: '978-1-111-11111-1', title: 'Book A', available_stock: 1 },
    { isbn: '978-2-222-22222-2', title: 'Book B', available_stock: 1 },
    { isbn: '978-3-333-33333-3', title: 'Book C', available_stock: 1 },
    { isbn: '978-4-444-44444-4', title: 'Book D', available_stock: 1 }
  ],

  testSteps: [
    { action: 'borrow', book_isbn: '978-1-111-11111-1', expected: 'success' },
    { action: 'borrow', book_isbn: '978-2-222-22222-2', expected: 'success' },
    { action: 'borrow', book_isbn: '978-3-333-33333-3', expected: 'success' },
    { action: 'borrow', book_isbn: '978-4-444-44444-4', expected: 'error', error_code: 'LOAN_LIMIT_EXCEEDED' }
  ]
};

module.exports = { loanLimitScenario };
```

---

## 5. E2Eテスト用データ

### データ要件

- **実環境**: 実際のデータベースとサーバ
- **ブラウザ操作**: 視覚的に確認可能
- **シナリオ駆動**: ユーザジャーニー全体をカバー

### E2E用シードスクリプト

```bash
# server/scripts/seed-e2e.sh
#!/bin/bash

# データベース初期化
sqlite3 data/test.db < server/src/db/schema.sql

# E2E用テストデータ挿入
sqlite3 data/test.db <<EOF
-- ユーザ
INSERT INTO users (username, password_hash, email, role) VALUES
  ('testuser', '\$2b\$10\$...(bcrypt hash for "user1234")', 'testuser@test.com', 'user'),
  ('testadmin', '\$2b\$10\$...(bcrypt hash for "admin123")', 'testadmin@test.com', 'admin');

-- 書籍 (検索・フィルタテスト用)
INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES
  ('978-4-295-00712-7', 'リーダブルコード', 'Dustin Boswell', 'オライリー・ジャパン', 2012, '技術書', 2, 2),
  ('978-0-13-468599-1', 'Clean Code', 'Robert C. Martin', 'Prentice Hall', 2008, '技術書', 1, 0),
  ('978-0-13-468599-2', 'Design Patterns', 'Gang of Four', 'Addison-Wesley', 1994, '技術書', 3, 3),
  ('978-4-04-600283-4', '7つの習慣', 'Stephen R. Covey', 'キングベアー出版', 1996, 'ビジネス書', 2, 2),
  ('978-4-16-660012-3', '人を動かす', 'Dale Carnegie', '創元社', 1936, 'ビジネス書', 1, 1);

-- 貸出履歴 (返却期限テスト用)
INSERT INTO loans (user_id, book_id, loan_date, due_date, return_date, status) VALUES
  (1, 2, datetime('now', '-5 days'), datetime('now', '+9 days'), NULL, 'borrowed'),  -- 期限内
  (1, 5, datetime('now', '-12 days'), datetime('now', '+2 days'), NULL, 'borrowed'); -- 期限間近
EOF

echo "E2E test data seeded successfully"
```

### Playwright用フィクスチャ

```javascript
// tests/e2e/fixtures/e2e-data.json
{
  "users": {
    "standardUser": {
      "username": "testuser",
      "password": "user1234",
      "email": "testuser@test.com"
    },
    "adminUser": {
      "username": "testadmin",
      "password": "admin123",
      "email": "testadmin@test.com"
    }
  },

  "searchQueries": {
    "exact": "リーダブルコード",
    "partial": "Clean",
    "category": "技術書",
    "author": "Martin",
    "noResults": "存在しない書籍タイトル12345"
  },

  "errorScenarios": {
    "invalidCredentials": {
      "username": "nonexistent",
      "password": "wrongpass"
    },
    "outOfStockBook": {
      "title": "Clean Code"
    }
  }
}
```

---

## 6. パフォーマンステスト用データ

### データ要件

- **大量**: 本番環境相当のデータ量
- **分散**: 現実的なデータ分布
- **変動**: アクティブ・非アクティブパターン

### 大量データ生成スクリプト

```javascript
// tests/performance/generate-large-dataset.js
const { faker } = require('@faker-js/faker');
const sqlite3 = require('sqlite3').verbose();

async function generateLargeDataset(config = {}) {
  const {
    userCount = 100,
    bookCount = 500,
    activeLoanCount = 200,
    historicalLoanCount = 1000
  } = config;

  const db = new sqlite3.Database(':memory:');

  console.log('Generating large dataset...');
  console.log(`Users: ${userCount}, Books: ${bookCount}, Active Loans: ${activeLoanCount}`);

  // ユーザ生成
  console.log('Generating users...');
  for (let i = 0; i < userCount; i++) {
    await db.run(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [
        `user_${i}_${faker.internet.userName()}`,
        '$2b$10$dummy_hash',  // パフォーマンステストではダミーハッシュ
        faker.internet.email(),
        i % 10 === 0 ? 'admin' : 'user'  // 10%が管理者
      ]
    );
  }

  // 書籍生成
  console.log('Generating books...');
  const categories = ['技術書', 'ビジネス書', '小説', '自己啓発', '歴史', '科学', '芸術'];

  for (let i = 0; i < bookCount; i++) {
    const totalStock = faker.number.int({ min: 1, max: 3 });
    const borrowed = faker.number.int({ min: 0, max: totalStock });
    const availableStock = totalStock - borrowed;

    await db.run(
      'INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        faker.commerce.isbn(13),
        faker.commerce.productName() + ' ' + faker.lorem.words(2),
        faker.person.fullName(),
        faker.company.name(),
        faker.date.past({ years: 30 }).getFullYear(),
        faker.helpers.arrayElement(categories),
        totalStock,
        availableStock
      ]
    );
  }

  // アクティブ貸出生成
  console.log('Generating active loans...');
  for (let i = 0; i < activeLoanCount; i++) {
    const userId = faker.number.int({ min: 1, max: userCount });
    const bookId = faker.number.int({ min: 1, max: bookCount });
    const loanDate = faker.date.recent({ days: 14 });
    const dueDate = new Date(loanDate);
    dueDate.setDate(dueDate.getDate() + 14);

    await db.run(
      'INSERT INTO loans (user_id, book_id, loan_date, due_date, status) VALUES (?, ?, ?, ?, ?)',
      [userId, bookId, loanDate.toISOString(), dueDate.toISOString(), 'borrowed']
    );
  }

  // 履歴貸出生成
  console.log('Generating historical loans...');
  for (let i = 0; i < historicalLoanCount; i++) {
    const userId = faker.number.int({ min: 1, max: userCount });
    const bookId = faker.number.int({ min: 1, max: bookCount });
    const loanDate = faker.date.past({ years: 2 });
    const dueDate = new Date(loanDate);
    dueDate.setDate(dueDate.getDate() + 14);
    const returnDate = faker.date.between({ from: loanDate, to: dueDate });

    await db.run(
      'INSERT INTO loans (user_id, book_id, loan_date, due_date, return_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, bookId, loanDate.toISOString(), dueDate.toISOString(), returnDate.toISOString(), 'returned']
    );
  }

  console.log('Large dataset generated successfully');
  return db;
}

module.exports = { generateLargeDataset };
```

### パフォーマンステスト用プロファイル

```yaml
# tests/performance/data-profiles.yml
load_test:
  users: 100
  books: 500
  active_loans: 200
  historical_loans: 1000
  concurrent_users: 50

stress_test:
  users: 500
  books: 2000
  active_loans: 1000
  historical_loans: 5000
  concurrent_users: 200

spike_test:
  users: 1000
  books: 5000
  active_loans: 2000
  historical_loans: 10000
  concurrent_users: 500
```

---

## 7. データ生成ユーティリティ

### Faker.js統合

```javascript
// tests/utils/data-generator.js
const { faker } = require('@faker-js/faker');

/**
 * ランダムなテストユーザを生成
 */
function generateTestUser(overrides = {}) {
  return {
    username: faker.internet.userName(),
    password: 'Test1234!',
    email: faker.internet.email(),
    role: 'user',
    created_at: faker.date.past().toISOString(),
    ...overrides
  };
}

/**
 * ランダムなテスト書籍を生成
 */
function generateTestBook(overrides = {}) {
  const totalStock = faker.number.int({ min: 1, max: 3 });
  const borrowed = faker.number.int({ min: 0, max: totalStock });

  return {
    isbn: faker.commerce.isbn(13),
    title: faker.commerce.productName() + ' - ' + faker.lorem.words(3),
    author: faker.person.fullName(),
    publisher: faker.company.name(),
    published_year: faker.date.past({ years: 20 }).getFullYear(),
    category: faker.helpers.arrayElement(['技術書', 'ビジネス書', '小説', '自己啓発']),
    total_stock: totalStock,
    available_stock: totalStock - borrowed,
    created_at: faker.date.past().toISOString(),
    ...overrides
  };
}

/**
 * ランダムな貸出レコードを生成
 */
function generateTestLoan(userId, bookId, overrides = {}) {
  const loanDate = faker.date.recent({ days: 14 });
  const dueDate = new Date(loanDate);
  dueDate.setDate(dueDate.getDate() + 14);

  return {
    user_id: userId,
    book_id: bookId,
    loan_date: loanDate.toISOString(),
    due_date: dueDate.toISOString(),
    return_date: null,
    status: 'borrowed',
    created_at: loanDate.toISOString(),
    ...overrides
  };
}

/**
 * 境界値テスト用データセット生成
 */
function generateBoundaryTestData() {
  return {
    users: [
      // 貸出数パターン
      generateTestUser({ username: 'user_0_loans' }),  // 0冊
      generateTestUser({ username: 'user_1_loan' }),   // 1冊
      generateTestUser({ username: 'user_2_loans' }),  // 2冊
      generateTestUser({ username: 'user_3_loans' })   // 3冊 (上限)
    ],

    books: [
      // 在庫パターン
      generateTestBook({ title: 'Book Stock 0', available_stock: 0, total_stock: 1 }),
      generateTestBook({ title: 'Book Stock 1', available_stock: 1, total_stock: 1 }),
      generateTestBook({ title: 'Book Stock 3', available_stock: 3, total_stock: 3 }),

      // タイトル長さ境界値
      generateTestBook({ title: 'A' }),  // 最短
      generateTestBook({ title: 'A'.repeat(200) }),  // 最長

      // 出版年境界値
      generateTestBook({ published_year: 1900 }),  // 最古
      generateTestBook({ published_year: new Date().getFullYear() })  // 最新
    ],

    loans: [
      // 期限パターン
      generateTestLoan(1, 1, { status: 'borrowed' }),  // 通常
      generateTestLoan(1, 2, {
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'borrowed'
      }),  // 期限間近 (2日後)
      generateTestLoan(1, 3, {
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'overdue'
      })  // 延滞 (1日前)
    ]
  };
}

/**
 * エッジケーステスト用データセット生成
 */
function generateEdgeCaseData() {
  return {
    // 特殊文字を含むデータ
    specialCharacters: {
      user: generateTestUser({
        username: 'user_with_特殊文字',
        email: 'special+test@example.com'
      }),
      book: generateTestBook({
        title: 'Book with "quotes" & <tags>',
        author: "O'Brien, John"
      })
    },

    // 極端な値
    extremeValues: {
      oldBook: generateTestBook({ published_year: 1800 }),
      futureBook: generateTestBook({ published_year: 2100 }),
      longTitle: generateTestBook({ title: 'A'.repeat(200) }),
      longAuthor: generateTestBook({ author: 'B'.repeat(100) })
    },

    // NULL/空値パターン
    nullableFields: {
      bookMinimal: {
        isbn: faker.commerce.isbn(13),
        title: faker.commerce.productName(),
        author: faker.person.fullName(),
        publisher: null,  // NULL許容
        published_year: null,  // NULL許容
        category: null,  // NULL許容
        total_stock: 1,
        available_stock: 1
      }
    }
  };
}

module.exports = {
  generateTestUser,
  generateTestBook,
  generateTestLoan,
  generateBoundaryTestData,
  generateEdgeCaseData
};
```

### データビルダーパターン

```javascript
// tests/utils/builders/user-builder.js
class UserBuilder {
  constructor() {
    this.user = {
      username: faker.internet.userName(),
      password: 'Test1234!',
      email: faker.internet.email(),
      role: 'user'
    };
  }

  withUsername(username) {
    this.user.username = username;
    return this;
  }

  withRole(role) {
    this.user.role = role;
    return this;
  }

  asAdmin() {
    this.user.role = 'admin';
    return this;
  }

  withLoans(count) {
    this.user.current_loans = count;
    return this;
  }

  build() {
    return { ...this.user };
  }
}

// 使用例
const user = new UserBuilder()
  .withUsername('testuser')
  .asAdmin()
  .build();
```

---

## 8. データクリーンアップ戦略

### クリーンアップレベル

| レベル | タイミング | 対象 | 方法 |
|-------|----------|------|------|
| **Test-level** | 各テスト後 | テスト生成データ | DELETE文 |
| **Suite-level** | テストスイート後 | フィクスチャデータ | TRUNCATE |
| **Session-level** | テストセッション後 | テストDB全体 | DROP DATABASE |

### クリーンアップユーティリティ

```javascript
// tests/utils/cleanup.js
async function cleanupTestData(db, level = 'test') {
  switch (level) {
    case 'test':
      // 各テスト後: トランザクションロールバック
      await db.exec('ROLLBACK');
      break;

    case 'suite':
      // テストスイート後: テーブルクリア
      await db.exec('DELETE FROM loans');
      await db.exec('DELETE FROM books');
      await db.exec('DELETE FROM users');
      await db.exec('VACUUM');  // データベース最適化
      break;

    case 'session':
      // テストセッション後: データベース削除
      await db.close();
      break;
  }
}

/**
 * トランザクション管理ヘルパー
 */
class TransactionManager {
  constructor(db) {
    this.db = db;
    this.inTransaction = false;
  }

  async begin() {
    if (!this.inTransaction) {
      await this.db.exec('BEGIN TRANSACTION');
      this.inTransaction = true;
    }
  }

  async commit() {
    if (this.inTransaction) {
      await this.db.exec('COMMIT');
      this.inTransaction = false;
    }
  }

  async rollback() {
    if (this.inTransaction) {
      await this.db.exec('ROLLBACK');
      this.inTransaction = false;
    }
  }

  async withTransaction(callback) {
    await this.begin();
    try {
      const result = await callback();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

module.exports = { cleanupTestData, TransactionManager };
```

### Jest/Vitest設定例

```javascript
// jest.config.js
module.exports = {
  globalSetup: './tests/setup/global-setup.js',
  globalTeardown: './tests/setup/global-teardown.js',
  setupFilesAfterEnv: ['./tests/setup/setup-after-env.js']
};

// tests/setup/global-setup.js
module.exports = async () => {
  // テストデータベース初期化
  const db = await createTestDatabase();
  await seedMasterData(db);
  global.__TEST_DB__ = db;
};

// tests/setup/global-teardown.js
module.exports = async () => {
  // テストデータベースクリーンアップ
  const db = global.__TEST_DB__;
  if (db) {
    await db.close();
  }
};

// tests/setup/setup-after-env.js
beforeEach(async () => {
  // 各テスト前: トランザクション開始
  await global.__TEST_DB__.exec('BEGIN TRANSACTION');
});

afterEach(async () => {
  // 各テスト後: ロールバック
  await global.__TEST_DB__.exec('ROLLBACK');
});
```

---

## データ整合性検証

### データ検証ヘルパー

```javascript
// tests/utils/validators.js
class DataValidator {
  /**
   * ユーザデータの整合性検証
   */
  static validateUser(user) {
    expect(user).toHaveProperty('id');
    expect(user.username).toMatch(/^[a-zA-Z0-9_]{3,20}$/);
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(['user', 'admin']).toContain(user.role);
  }

  /**
   * 書籍データの整合性検証
   */
  static validateBook(book) {
    expect(book).toHaveProperty('id');
    expect(book.isbn).toMatch(/^978-\d-\d{3}-\d{5}-\d$/);
    expect(book.title).toBeTruthy();
    expect(book.title.length).toBeLessThanOrEqual(200);
    expect(book.total_stock).toBeGreaterThanOrEqual(1);
    expect(book.total_stock).toBeLessThanOrEqual(3);
    expect(book.available_stock).toBeGreaterThanOrEqual(0);
    expect(book.available_stock).toBeLessThanOrEqual(book.total_stock);
  }

  /**
   * 貸出データの整合性検証
   */
  static validateLoan(loan) {
    expect(loan).toHaveProperty('id');
    expect(loan).toHaveProperty('user_id');
    expect(loan).toHaveProperty('book_id');

    const loanDate = new Date(loan.loan_date);
    const dueDate = new Date(loan.due_date);
    const daysDiff = Math.floor((dueDate - loanDate) / (1000 * 60 * 60 * 24));

    expect(daysDiff).toBe(14);  // 返却期限は14日後
    expect(['borrowed', 'returned', 'overdue']).toContain(loan.status);

    if (loan.status === 'returned') {
      expect(loan.return_date).toBeTruthy();
    }
  }

  /**
   * データベース整合性検証
   */
  static async validateDatabaseIntegrity(db) {
    // 在庫整合性チェック
    const stockCheck = await db.all(`
      SELECT
        b.id,
        b.title,
        b.total_stock,
        b.available_stock,
        COUNT(l.id) as active_loans
      FROM books b
      LEFT JOIN loans l ON b.id = l.book_id AND l.status = 'borrowed'
      GROUP BY b.id
      HAVING b.available_stock != (b.total_stock - active_loans)
    `);

    expect(stockCheck).toHaveLength(0);  // 在庫不整合が無いこと

    // 貸出上限チェック
    const loanLimitCheck = await db.all(`
      SELECT
        u.id,
        u.username,
        COUNT(l.id) as active_loans
      FROM users u
      LEFT JOIN loans l ON u.id = l.user_id AND l.status = 'borrowed'
      GROUP BY u.id
      HAVING COUNT(l.id) > 3
    `);

    expect(loanLimitCheck).toHaveLength(0);  // 貸出上限超過が無いこと
  }
}

module.exports = { DataValidator };
```

---

## ベストプラクティス

### 1. データ独立性の確保

```javascript
// ❌ 悪い例: テスト間でデータ共有
let sharedUser;

test('create user', () => {
  sharedUser = createUser();
});

test('update user', () => {
  updateUser(sharedUser.id);  // 前のテストに依存
});

// ✅ 良い例: 各テストで独立したデータ
test('create user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});

test('update user', () => {
  const user = createUser();  // 新規作成
  updateUser(user.id);
});
```

### 2. 境界値の明示的テスト

```javascript
// ✅ 境界値を明示的にテスト
test('loan limit - exactly 3 books', async () => {
  const user = await createUser();

  // 3冊借りる (境界値)
  await borrowBook(user.id, book1.id);
  await borrowBook(user.id, book2.id);
  await borrowBook(user.id, book3.id);

  // 4冊目は失敗すべき (境界値超過)
  await expect(borrowBook(user.id, book4.id))
    .rejects.toThrow('LOAN_LIMIT_EXCEEDED');
});
```

### 3. データ生成のシード固定

```javascript
// ✅ テスト再現性のためシード固定
const { faker } = require('@faker-js/faker');

beforeAll(() => {
  faker.seed(12345);  // 固定シード
});

test('generate consistent data', () => {
  const user1 = generateTestUser();
  const user2 = generateTestUser();
  // 毎回同じデータが生成される
});
```

---

## まとめ

### データ管理チェックリスト

- [ ] マスタデータをSQLファイルで管理
- [ ] フィクスチャをJSON/YAMLで保存
- [ ] Faker.jsで動的データ生成
- [ ] ビルダーパターンでデータ構築
- [ ] トランザクション管理でクリーンアップ
- [ ] データ整合性を自動検証
- [ ] 境界値とエッジケースをカバー
- [ ] 大量データ生成スクリプトを用意

### 次のステップ

1. **データジェネレータ実装**: tests/utils/data-generator.js
2. **フィクスチャファイル作成**: tests/fixtures/*.json
3. **シードスクリプト作成**: server/scripts/seed-*.sh
4. **クリーンアップ自動化**: Jest/Vitest設定
5. **データ検証ヘルパー**: tests/utils/validators.js

---

**作成者**: Quality Engineer
**レビュー日**: 2025-01-11
**関連ドキュメント**: TEST_STRATEGY.md, TEST_CASES.md, CI_CD_GUIDE.md
