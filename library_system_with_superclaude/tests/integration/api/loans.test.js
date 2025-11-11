/**
 * Loan API Integration Tests
 *
 * Tests API endpoints with real database interactions:
 * - POST /api/loans (書籍を借りる)
 * - GET /api/loans/my-loans (自分の貸出状況)
 * - PUT /api/loans/:id/return (書籍を返却)
 * - GET /api/loans/overdue (延滞書籍一覧 - 管理者のみ)
 *
 * Integration test strategy:
 * - Real SQLite database (in-memory)
 * - Full Express app with middleware stack
 * - Authentication via session cookies
 * - Database transactions and rollback
 */

const request = require('supertest');
const app = require('../../../server/src/app');
const db = require('../../../server/src/config/database');
const { hashPassword } = require('../../../server/src/utils/passwordHash');

describe('Loan API Integration Tests', () => {
  let agent;
  let userCookie;
  let adminCookie;
  let testUserId;
  let testAdminId;
  let testBookId1;
  let testBookId2;
  let testBookId3;
  let testBookId4;

  beforeAll(async () => {
    // Initialize test database
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        isbn TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        publisher TEXT,
        published_year INTEGER,
        category TEXT,
        total_stock INTEGER NOT NULL DEFAULT 1 CHECK(total_stock >= 0 AND total_stock <= 3),
        available_stock INTEGER NOT NULL DEFAULT 1 CHECK(available_stock >= 0),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        loan_date TEXT NOT NULL DEFAULT (datetime('now')),
        due_date TEXT NOT NULL,
        return_date TEXT,
        status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);

    // Create test users
    const userPasswordHash = await hashPassword('user1234');
    const adminPasswordHash = await hashPassword('admin123');

    const userResult = await db.runAsync(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      ['testuser', userPasswordHash, 'testuser@test.com', 'user']
    );
    testUserId = userResult.lastID;

    const adminResult = await db.runAsync(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      ['testadmin', adminPasswordHash, 'testadmin@test.com', 'admin']
    );
    testAdminId = adminResult.lastID;

    // Create test books
    const book1 = await db.runAsync(
      'INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['978-4-295-00001-1', 'Test Book 1', 'Test Author', 'Test Publisher', 2020, '技術書', 1, 1]
    );
    testBookId1 = book1.lastID;

    const book2 = await db.runAsync(
      'INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['978-4-295-00002-2', 'Test Book 2', 'Test Author', 'Test Publisher', 2021, '技術書', 1, 0]
    );
    testBookId2 = book2.lastID;

    const book3 = await db.runAsync(
      'INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['978-4-295-00003-3', 'Test Book 3', 'Test Author', 'Test Publisher', 2022, '技術書', 2, 2]
    );
    testBookId3 = book3.lastID;

    const book4 = await db.runAsync(
      'INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['978-4-295-00004-4', 'Test Book 4', 'Test Author', 'Test Publisher', 2023, '技術書', 1, 1]
    );
    testBookId4 = book4.lastID;

    // Login as user
    agent = request.agent(app);
    const userLoginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'user1234' });
    userCookie = userLoginRes.headers['set-cookie'];

    // Login as admin
    const adminAgent = request.agent(app);
    const adminLoginRes = await adminAgent
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'admin123' });
    adminCookie = adminLoginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    // Clean up test database
    await db.runAsync('DROP TABLE IF EXISTS loans');
    await db.runAsync('DROP TABLE IF EXISTS books');
    await db.runAsync('DROP TABLE IF EXISTS users');
  });

  afterEach(async () => {
    // Clean up loans after each test
    await db.runAsync('DELETE FROM loans');
    // Reset book stock
    await db.runAsync('UPDATE books SET available_stock = total_stock');
  });

  describe('POST /api/loans - 書籍を借りる', () => {
    it('LOAN-001: 在庫がある書籍を正常に借りられる', async () => {
      // When: 貸出リクエスト
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 })
        .expect(201);

      // Then: 成功レスポンス
      expect(response.body.success).toBe(true);
      expect(response.body.data.loan).toHaveProperty('id');
      expect(response.body.data.loan.book_id).toBe(testBookId1);
      expect(response.body.data.loan.status).toBe('borrowed');

      // 返却期限が14日後であることを確認
      const loanDate = new Date(response.body.data.loan.loan_date);
      const dueDate = new Date(response.body.data.loan.due_date);
      const daysDiff = Math.floor((dueDate - loanDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(14);

      // 在庫が減っているか確認
      const bookRes = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie)
        .expect(200);

      expect(bookRes.body.data.book.available_stock).toBe(0);
    });

    it('LOAN-003: 在庫0の書籍を借りようとすると409エラー', async () => {
      // Given: 在庫0の書籍
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId2 })
        .expect(409);

      // Then: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOK_NOT_AVAILABLE');
      expect(response.body.error.message).toContain('現在貸出中');
    });

    it('LOAN-004: 貸出上限（3冊）に達している場合、409エラーを返す', async () => {
      // Given: 既に3冊借りているユーザ
      // 1冊目
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 });

      // 2冊目と3冊目
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId3 });

      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId4 });

      // When: 4冊目を借りようとする
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId3 })
        .expect(409);

      // Then: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOAN_LIMIT_EXCEEDED');
      expect(response.body.error.details.current_loans).toBe(3);
    });

    it('LOAN-005: 同じ書籍を重複して借りることはできない', async () => {
      // Given: 既に借りている書籍
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 });

      // When: 同じ書籍を再度借りようとする
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 })
        .expect(409);

      // Then: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_LOAN');
      expect(response.body.error.message).toContain('既に借りています');
    });

    it('LOAN-006: 存在しない書籍を借りようとすると404エラー', async () => {
      // When: 存在しないbook_id
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: 99999 })
        .expect(404);

      // Then: エラーレスポンス
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOK_NOT_FOUND');
    });

    it('LOAN-008: 未認証ユーザは401エラーを返す', async () => {
      // When: Cookieなしでリクエスト
      const response = await request(app)
        .post('/api/loans')
        .send({ book_id: testBookId1 })
        .expect(401);

      // Then: 認証エラー
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('EDGE-001: ちょうど3冊目を借りることができる', async () => {
      // Given: 2冊借りている状態
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 });

      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId4 });

      // When: 3冊目を借りる
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId3 })
        .expect(201);

      // Then: 成功
      expect(response.body.success).toBe(true);
      expect(response.body.data.loan.status).toBe('borrowed');
    });

    it('EDGE-003: 最後の1冊を借りると在庫が0になる', async () => {
      // Given: 在庫1の書籍
      // When: 借りる
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 })
        .expect(201);

      // Then: 在庫が0になる
      const bookRes = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);

      expect(bookRes.body.data.book.available_stock).toBe(0);
    });
  });

  describe('GET /api/loans/my-loans - 自分の貸出状況', () => {
    it('LOAN-101: 貸出中の書籍がある場合、正しく取得できる', async () => {
      // Given: 2冊借りている状態
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 });

      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId3 });

      // When: 貸出状況を取得
      const response = await agent
        .get('/api/loans/my-loans')
        .set('Cookie', userCookie)
        .expect(200);

      // Then: 成功レスポンス
      expect(response.body.success).toBe(true);
      expect(response.body.data.loans).toHaveLength(2);
      expect(response.body.data.summary.total_borrowed).toBe(2);
      expect(response.body.data.summary.max_allowed).toBe(3);
      expect(response.body.data.summary.available_slots).toBe(1);
    });

    it('LOAN-102: 貸出中なしの場合、空配列を返す', async () => {
      // When: 何も借りていない状態で取得
      const response = await agent
        .get('/api/loans/my-loans')
        .set('Cookie', userCookie)
        .expect(200);

      // Then: 空配列
      expect(response.body.success).toBe(true);
      expect(response.body.data.loans).toHaveLength(0);
      expect(response.body.data.summary.available_slots).toBe(3);
    });
  });

  describe('PUT /api/loans/:id/return - 書籍を返却', () => {
    let loanId;

    beforeEach(async () => {
      // 事前に書籍を借りる
      const loanRes = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 });
      loanId = loanRes.body.data.loan.id;
    });

    it('RET-001: 貸出中の書籍を正常に返却できる', async () => {
      // When: 返却リクエスト
      const response = await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', userCookie)
        .expect(200);

      // Then: 成功レスポンス
      expect(response.body.success).toBe(true);
      expect(response.body.data.loan.status).toBe('returned');
      expect(response.body.data.loan.return_date).not.toBeNull();

      // 在庫が増えているか確認
      const bookRes = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);

      expect(bookRes.body.data.book.available_stock).toBe(1);
    });

    it('RET-004: 既に返却済みの書籍は409エラー', async () => {
      // Given: 返却済みにする
      await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', userCookie);

      // When: 再度返却しようとする
      const response = await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', userCookie)
        .expect(409);

      // Then: エラー
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOAN_ALREADY_RETURNED');
    });

    it('RET-005: 存在しない貸出IDは404エラー', async () => {
      // When: 存在しないloan_id
      const response = await agent
        .put('/api/loans/99999/return')
        .set('Cookie', userCookie)
        .expect(404);

      // Then: エラー
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOAN_NOT_FOUND');
    });

    it('RET-006: 他人の貸出を返却できない（権限エラー）', async () => {
      // Given: 別ユーザでログイン
      const otherAgent = request.agent(app);
      const otherPasswordHash = await hashPassword('other1234');
      await db.runAsync(
        'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        ['otheruser', otherPasswordHash, 'other@test.com', 'user']
      );
      await otherAgent
        .post('/api/auth/login')
        .send({ username: 'otheruser', password: 'other1234' });

      // When: 他人の貸出を返却しようとする
      const response = await otherAgent
        .put(`/api/loans/${loanId}/return`)
        .expect(403);

      // Then: 権限エラー
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('RET-007: 管理者は他人の貸出も返却可能', async () => {
      // When: 管理者が返却
      const response = await request(app)
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Then: 成功
      expect(response.body.success).toBe(true);
      expect(response.body.data.loan.status).toBe('returned');
    });

    it('RET-008: 返却時に在庫が正確に+1される', async () => {
      // Given: 在庫確認
      const beforeBook = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);
      const beforeStock = beforeBook.body.data.book.available_stock;

      // When: 返却
      await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', userCookie);

      // Then: 在庫が+1
      const afterBook = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);
      const afterStock = afterBook.body.data.book.available_stock;

      expect(afterStock).toBe(beforeStock + 1);
    });

    it('RET-009: 返却後に再度同じ書籍を借りられる', async () => {
      // Given: 返却
      await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', userCookie);

      // When: 再度借りる
      const response = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 })
        .expect(201);

      // Then: 成功
      expect(response.body.success).toBe(true);
    });
  });

  describe('エンドツーエンドフロー', () => {
    it('貸出 → 返却 → 再貸出が正常に動作する', async () => {
      // Step 1: 貸出
      const loanRes = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 })
        .expect(201);

      const loanId = loanRes.body.data.loan.id;

      // Step 2: 在庫確認（0になっている）
      let bookRes = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);
      expect(bookRes.body.data.book.available_stock).toBe(0);

      // Step 3: 返却
      await agent
        .put(`/api/loans/${loanId}/return`)
        .set('Cookie', userCookie)
        .expect(200);

      // Step 4: 在庫確認（1に戻っている）
      bookRes = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);
      expect(bookRes.body.data.book.available_stock).toBe(1);

      // Step 5: 再度貸出可能
      const reLoanRes = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 })
        .expect(201);

      expect(reLoanRes.body.success).toBe(true);
    });

    it('3冊借りる → 1冊返却 → 新しい1冊借りる', async () => {
      // Step 1: 3冊借りる
      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId1 });

      await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId3 });

      const loan3Res = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId4 });

      // Step 2: 1冊返却
      await agent
        .put(`/api/loans/${loan3Res.body.data.loan.id}/return`)
        .set('Cookie', userCookie);

      // Step 3: 新しい1冊を借りる
      const newLoanRes = await agent
        .post('/api/loans')
        .set('Cookie', userCookie)
        .send({ book_id: testBookId4 })
        .expect(201);

      expect(newLoanRes.body.success).toBe(true);

      // Step 4: 貸出状況確認（3冊借りている）
      const myLoansRes = await agent
        .get('/api/loans/my-loans')
        .set('Cookie', userCookie);

      expect(myLoansRes.body.data.summary.total_borrowed).toBe(3);
    });
  });

  describe('トランザクション整合性テスト', () => {
    it('INT-002: 同時貸出時、在庫が正しく管理される', async () => {
      // Given: 在庫1の書籍を2人が同時に借りようとする
      const user2PasswordHash = await hashPassword('user2pass');
      await db.runAsync(
        'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        ['testuser2', user2PasswordHash, 'testuser2@test.com', 'user']
      );

      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/login')
        .send({ username: 'testuser2', password: 'user2pass' });

      // When: 同時リクエスト
      const results = await Promise.allSettled([
        agent.post('/api/loans').set('Cookie', userCookie).send({ book_id: testBookId1 }),
        agent2.post('/api/loans').send({ book_id: testBookId1 })
      ]);

      // Then: 1人だけ成功する
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
      expect(successCount).toBe(1);

      // 在庫は0
      const bookRes = await agent
        .get(`/api/books/${testBookId1}`)
        .set('Cookie', userCookie);
      expect(bookRes.body.data.book.available_stock).toBe(0);
    });
  });
});
