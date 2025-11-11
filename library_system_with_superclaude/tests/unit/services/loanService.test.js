/**
 * Loan Service Unit Tests
 *
 * Tests critical business logic:
 * - 3-book loan limit enforcement
 * - Inventory management (available_stock tracking)
 * - 14-day return period calculation
 * - Duplicate loan prevention
 * - Transaction safety
 */

const loanService = require('../../../server/src/services/loanService');
const loanRepository = require('../../../server/src/repositories/loanRepository');
const bookRepository = require('../../../server/src/repositories/bookRepository');
const userRepository = require('../../../server/src/repositories/userRepository');

// Mock all repository dependencies
jest.mock('../../../server/src/repositories/loanRepository');
jest.mock('../../../server/src/repositories/bookRepository');
jest.mock('../../../server/src/repositories/userRepository');

describe('LoanService.createLoan - 貸出処理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-11T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('正常系テスト', () => {
    it('LOAN-001: 在庫がある書籍を正常に借りられる', async () => {
      // Given: ユーザは0冊借りている、書籍の在庫は1
      const userId = 1;
      const bookId = 2;

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        title: 'Clean Code',
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);
      loanRepository.create.mockResolvedValue(10);
      loanRepository.findById.mockResolvedValue({
        id: 10,
        user_id: userId,
        book_id: bookId,
        loan_date: '2025-01-11T10:00:00Z',
        due_date: '2025-01-25T10:00:00Z',
        status: 'borrowed'
      });
      bookRepository.updateStock.mockResolvedValue(true);

      // When: 貸出を作成
      const loan = await loanService.createLoan(userId, bookId);

      // Then: 貸出レコードが作成され、在庫が減る
      expect(loan).toHaveProperty('id', 10);
      expect(loan.status).toBe('borrowed');
      expect(bookRepository.updateStock).toHaveBeenCalledWith(bookId, -1);
    });

    it('LOAN-002: 返却期限が正確に14日後に設定される', async () => {
      // Given: 現在時刻 2025-01-11T10:00:00Z
      const userId = 1;
      const bookId = 2;
      const today = new Date('2025-01-11T10:00:00Z');
      jest.setSystemTime(today);

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);

      // When: 貸出を作成
      await loanService.createLoan(userId, bookId);

      // Then: due_date が正確に14日後
      const createCallArgs = loanRepository.create.mock.calls[0][0];
      const dueDate = new Date(createCallArgs.due_date);
      const expectedDueDate = new Date('2025-01-25T10:00:00Z');

      expect(dueDate.toISOString()).toBe(expectedDueDate.toISOString());
    });

    it('LOAN-009: ちょうど3冊目を借りることができる', async () => {
      // Given: ユーザは既に2冊借りている
      const userId = 1;
      const bookId = 3;

      userRepository.getActiveLoanCount.mockResolvedValue(2);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);
      loanRepository.create.mockResolvedValue(11);
      loanRepository.findById.mockResolvedValue({
        id: 11,
        status: 'borrowed'
      });

      // When: 3冊目を借りる
      const loan = await loanService.createLoan(userId, bookId);

      // Then: 成功する
      expect(loan.status).toBe('borrowed');
      expect(userRepository.getActiveLoanCount).toHaveBeenCalledWith(userId);
    });
  });

  describe('異常系テスト - ビジネスルール違反', () => {
    it('LOAN-004: 貸出上限（3冊）に達している場合、エラーを返す', async () => {
      // Given: ユーザは既に3冊借りている
      const userId = 1;
      const bookId = 5;

      userRepository.getActiveLoanCount.mockResolvedValue(3);

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('貸出上限（3冊）に達しています');

      // 在庫確認すら行われない
      expect(bookRepository.findById).not.toHaveBeenCalled();
    });

    it('LOAN-003: 在庫0の書籍を借りようとすると409エラー', async () => {
      // Given: 書籍の在庫が0
      const userId = 1;
      const bookId = 2;

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        title: 'Clean Code',
        available_stock: 0
      });

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('この書籍は現在貸出中です');

      expect(loanRepository.create).not.toHaveBeenCalled();
    });

    it('LOAN-005: 同じ書籍を重複して借りることはできない', async () => {
      // Given: ユーザが既に同じ書籍を借りている
      const userId = 1;
      const bookId = 2;

      userRepository.getActiveLoanCount.mockResolvedValue(1);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(true);

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('この書籍は既に借りています');

      expect(loanRepository.create).not.toHaveBeenCalled();
    });

    it('LOAN-006: 存在しない書籍を借りようとすると404エラー', async () => {
      // Given: 書籍が存在しない
      const userId = 1;
      const bookId = 9999;

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue(null);

      // When/Then: エラーが発生する
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('書籍が見つかりません');
    });
  });

  describe('エッジケーステスト', () => {
    it('EDGE-001: 貸出制限 - ちょうど3冊目（境界値テスト）', async () => {
      // Given: 現在2冊借りている
      const userId = 1;
      const bookId = 3;

      userRepository.getActiveLoanCount.mockResolvedValue(2);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);
      loanRepository.create.mockResolvedValue(12);
      loanRepository.findById.mockResolvedValue({
        id: 12,
        status: 'borrowed'
      });

      // When: 3冊目を借りる
      const loan = await loanService.createLoan(userId, bookId);

      // Then: 成功
      expect(loan).toBeDefined();
      expect(loan.status).toBe('borrowed');
    });

    it('EDGE-002: 貸出制限 - 4冊目を試行（境界値超過）', async () => {
      // Given: 既に3冊借りている
      const userId = 1;
      const bookId = 4;

      userRepository.getActiveLoanCount.mockResolvedValue(3);

      // When/Then: エラー
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('貸出上限（3冊）に達しています');
    });

    it('EDGE-003: 在庫管理 - 最後の1冊を借りる', async () => {
      // Given: 在庫が1
      const userId = 1;
      const bookId = 5;

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);
      loanRepository.create.mockResolvedValue(13);
      loanRepository.findById.mockResolvedValue({
        id: 13,
        status: 'borrowed'
      });
      bookRepository.updateStock.mockResolvedValue(true);

      // When: 借りる
      await loanService.createLoan(userId, bookId);

      // Then: 在庫が0になる（-1される）
      expect(bookRepository.updateStock).toHaveBeenCalledWith(bookId, -1);
    });

    it('EDGE-004: 在庫管理 - 在庫0から借りることはできない', async () => {
      // Given: 在庫が0
      const userId = 1;
      const bookId = 6;

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 0
      });

      // When/Then: エラー
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('この書籍は現在貸出中です');
    });

    it('EDGE-005: 期限計算 - 正確に14日後（日付境界値テスト）', async () => {
      // Given: 2025-01-11 10:00:00 に借りる
      const userId = 1;
      const bookId = 7;
      const loanDate = new Date('2025-01-11T10:00:00Z');
      jest.setSystemTime(loanDate);

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);

      // When: 貸出を作成
      await loanService.createLoan(userId, bookId);

      // Then: due_date が 2025-01-25 10:00:00
      const createCallArgs = loanRepository.create.mock.calls[0][0];
      const dueDate = new Date(createCallArgs.due_date);
      const expectedDueDate = new Date('2025-01-25T10:00:00Z');

      expect(dueDate.toISOString()).toBe(expectedDueDate.toISOString());

      // 日数計算確認
      const daysDiff = Math.floor((dueDate - loanDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(14);
    });

    it('EDGE-006: 期限計算 - 月末をまたぐケース（1/25 → 2/8）', async () => {
      // Given: 1月25日に借りる
      const userId = 1;
      const bookId = 8;
      const loanDate = new Date('2025-01-25T14:00:00Z');
      jest.setSystemTime(loanDate);

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);

      // When: 貸出を作成
      await loanService.createLoan(userId, bookId);

      // Then: due_date が 2月8日
      const createCallArgs = loanRepository.create.mock.calls[0][0];
      const dueDate = new Date(createCallArgs.due_date);
      const expectedDueDate = new Date('2025-02-08T14:00:00Z');

      expect(dueDate.toISOString()).toBe(expectedDueDate.toISOString());
    });
  });

  describe('データ整合性テスト', () => {
    it('INT-001: トランザクション - エラー時はロールバック想定', async () => {
      // Given: 在庫減少後にエラーが発生する
      const userId = 1;
      const bookId = 9;

      userRepository.getActiveLoanCount.mockResolvedValue(0);
      bookRepository.findById.mockResolvedValue({
        id: bookId,
        available_stock: 1
      });
      loanRepository.hasDuplicateLoan.mockResolvedValue(false);
      loanRepository.create.mockRejectedValue(new Error('Database error'));

      // When/Then: エラーが発生
      await expect(loanService.createLoan(userId, bookId))
        .rejects
        .toThrow('Database error');

      // Note: 実際のトランザクションロールバックはDB層で実装
      // 単体テストではエラー伝播のみ確認
    });
  });
});

describe('LoanService.returnLoan - 返却処理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系テスト', () => {
    it('RET-001: 貸出中の書籍を正常に返却できる', async () => {
      // Given: 貸出中の書籍
      const loanId = 10;
      const userId = 1;

      loanRepository.findById.mockResolvedValue({
        id: loanId,
        user_id: userId,
        book_id: 2,
        status: 'borrowed',
        due_date: '2025-01-25T10:00:00Z',
        return_date: null
      });
      loanRepository.return.mockResolvedValue(true);
      loanRepository.findById.mockResolvedValueOnce({
        id: loanId,
        user_id: userId,
        book_id: 2,
        status: 'borrowed'
      }).mockResolvedValueOnce({
        id: loanId,
        user_id: userId,
        book_id: 2,
        status: 'returned',
        return_date: '2025-01-20T10:00:00Z'
      });
      bookRepository.updateStock.mockResolvedValue(true);

      // When: 返却する
      const loan = await loanService.returnLoan(loanId, userId, false);

      // Then: 返却成功、在庫が増える
      expect(loan.status).toBe('returned');
      expect(bookRepository.updateStock).toHaveBeenCalledWith(2, 1);
    });

    it('RET-002: 返却日時が記録される', async () => {
      // Given
      const loanId = 11;
      const userId = 1;

      loanRepository.findById.mockResolvedValue({
        id: loanId,
        user_id: userId,
        book_id: 3,
        status: 'borrowed'
      });
      loanRepository.return.mockResolvedValue(true);
      loanRepository.findById.mockResolvedValueOnce({
        id: loanId,
        user_id: userId,
        book_id: 3,
        status: 'borrowed'
      }).mockResolvedValueOnce({
        id: loanId,
        status: 'returned',
        return_date: '2025-01-20T15:30:00Z'
      });

      // When
      const loan = await loanService.returnLoan(loanId, userId, false);

      // Then: return_date が設定されている
      expect(loan.return_date).toBeTruthy();
    });
  });

  describe('異常系テスト', () => {
    it('RET-004: 既に返却済みの書籍は409エラー', async () => {
      // Given: 既に返却済み
      const loanId = 12;
      const userId = 1;

      loanRepository.findById.mockResolvedValue({
        id: loanId,
        user_id: userId,
        book_id: 4,
        status: 'returned',
        return_date: '2025-01-15T10:00:00Z'
      });

      // When/Then: エラー
      await expect(loanService.returnLoan(loanId, userId, false))
        .rejects
        .toThrow('この書籍は既に返却済みです');

      expect(loanRepository.return).not.toHaveBeenCalled();
    });

    it('RET-005: 存在しない貸出IDは404エラー', async () => {
      // Given: 貸出記録が存在しない
      const loanId = 9999;
      const userId = 1;

      loanRepository.findById.mockResolvedValue(null);

      // When/Then: エラー
      await expect(loanService.returnLoan(loanId, userId, false))
        .rejects
        .toThrow('貸出記録が見つかりません');
    });

    it('RET-006: 他人の貸出を返却できない（権限エラー）', async () => {
      // Given: 他のユーザの貸出
      const loanId = 13;
      const currentUserId = 1;
      const ownerUserId = 2;

      loanRepository.findById.mockResolvedValue({
        id: loanId,
        user_id: ownerUserId,
        book_id: 5,
        status: 'borrowed'
      });

      // When/Then: エラー
      await expect(loanService.returnLoan(loanId, currentUserId, false))
        .rejects
        .toThrow('この貸出記録にアクセスする権限がありません');
    });

    it('RET-007: 管理者は他人の貸出も返却可能', async () => {
      // Given: 他のユーザの貸出、管理者権限
      const loanId = 14;
      const adminUserId = 1;
      const ownerUserId = 2;
      const isAdmin = true;

      loanRepository.findById.mockResolvedValue({
        id: loanId,
        user_id: ownerUserId,
        book_id: 6,
        status: 'borrowed'
      });
      loanRepository.return.mockResolvedValue(true);
      loanRepository.findById.mockResolvedValueOnce({
        id: loanId,
        user_id: ownerUserId,
        book_id: 6,
        status: 'borrowed'
      }).mockResolvedValueOnce({
        id: loanId,
        status: 'returned'
      });
      bookRepository.updateStock.mockResolvedValue(true);

      // When: 管理者が返却
      const loan = await loanService.returnLoan(loanId, adminUserId, isAdmin);

      // Then: 成功
      expect(loan.status).toBe('returned');
    });
  });

  describe('トランザクションテスト', () => {
    it('RET-008: 返却時に在庫が正確に+1される', async () => {
      // Given
      const loanId = 15;
      const userId = 1;
      const bookId = 7;

      loanRepository.findById.mockResolvedValue({
        id: loanId,
        user_id: userId,
        book_id: bookId,
        status: 'borrowed'
      });
      loanRepository.return.mockResolvedValue(true);
      loanRepository.findById.mockResolvedValueOnce({
        id: loanId,
        user_id: userId,
        book_id: bookId,
        status: 'borrowed'
      }).mockResolvedValueOnce({
        id: loanId,
        status: 'returned'
      });
      bookRepository.updateStock.mockResolvedValue(true);

      // When
      await loanService.returnLoan(loanId, userId, false);

      // Then: 在庫が+1される
      expect(bookRepository.updateStock).toHaveBeenCalledWith(bookId, 1);
    });
  });
});
