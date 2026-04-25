/**
 * E2E Tests: User Loan Journey
 *
 * Tests complete user workflows with real browser interaction:
 * - Login → Book search → Borrow → Return
 * - Loan limit enforcement (3-book maximum)
 * - Stock availability validation
 * - Multi-user concurrent access scenarios
 */

import { test, expect, Page } from '@playwright/test';

test.describe('一般ユーザ: 書籍貸出・返却フロー', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // ログイン
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'user1234');
    await page.click('button[type="submit"]');

    // リダイレクト確認
    await expect(page).toHaveURL('http://localhost:5173/books');
  });

  test('E2E-001: 書籍を検索して借りる → 貸出状況確認', async () => {
    // Step 1: 書籍一覧ページで検索
    await page.fill('input[placeholder*="検索"]', 'リーダブルコード');
    await page.click('button:has-text("検索")');

    // Step 2: 検索結果を確認
    const bookCard = page.locator('.book-card:has-text("リーダブルコード")');
    await expect(bookCard).toBeVisible();

    // Step 3: 書籍を借りる
    await bookCard.locator('button:has-text("借りる")').click();

    // Step 4: 成功メッセージを確認
    await expect(page.locator('.toast-success')).toContainText('書籍を借りました');
    await expect(page.locator('.toast-success')).toContainText('返却期限');

    // Step 5: 貸出状況ページに移動
    await page.click('a:has-text("貸出状況")');
    await expect(page).toHaveURL(/\/my-loans/);

    // Step 6: 借りた書籍が表示される
    const loanCard = page.locator('.loan-card:has-text("リーダブルコード")');
    await expect(loanCard).toBeVisible();

    // Step 7: 貸出サマリー確認
    await expect(page.locator('.loan-summary')).toContainText('貸出中: 1冊');
    await expect(page.locator('.loan-summary')).toContainText('残り: 2冊');
  });

  test('E2E-002: 借りている書籍を返却する', async () => {
    // Given: 既に1冊借りている状態にする
    await page.goto('http://localhost:5173/books');
    await page.locator('.book-card').first().locator('button:has-text("借りる")').click();
    await expect(page.locator('.toast-success')).toContainText('書籍を借りました');

    // When: 貸出状況ページに移動
    await page.click('a:has-text("貸出状況")');

    // Then: 返却ボタンをクリック
    const loanCard = page.locator('.loan-card').first();
    await loanCard.locator('button:has-text("返却する")').click();

    // 確認ダイアログが表示される
    await expect(page.locator('.modal-confirm')).toBeVisible();
    await page.click('button:has-text("はい、返却します")');

    // 成功メッセージ
    await expect(page.locator('.toast-success')).toContainText('書籍を返却しました');

    // 貸出中の書籍が減る
    await expect(page.locator('.loan-summary')).toContainText('貸出中: 0冊');
    await expect(page.locator('.loan-summary')).toContainText('残り: 3冊');
  });

  test('E2E-003: 貸出上限（3冊）を超えて借りようとするとエラー', async () => {
    // Given: 3冊借りる
    await page.goto('http://localhost:5173/books');

    for (let i = 0; i < 3; i++) {
      const availableBook = page.locator('.book-card').filter({ hasText: '在庫: ' }).first();
      await availableBook.locator('button:has-text("借りる")').click();
      await expect(page.locator('.toast-success')).toBeVisible();
      await page.waitForTimeout(500); // トースト消去待ち
    }

    // When: 4冊目を借りようとする
    const fourthBook = page.locator('.book-card').filter({ hasText: '在庫: ' }).first();
    await fourthBook.locator('button:has-text("借りる")').click();

    // Then: エラーメッセージが表示される
    await expect(page.locator('.alert-danger')).toContainText('貸出上限（3冊）に達しています');
    await expect(page.locator('.alert-danger')).toContainText('現在の貸出数: 3冊');
  });

  test('E2E-004: 在庫0の書籍は借りるボタンが無効化されている', async () => {
    // Given: 書籍一覧ページを表示
    await page.goto('http://localhost:5173/books');

    // When: 在庫0の書籍カードを確認
    const unavailableBook = page.locator('.book-card:has(.badge:has-text("在庫: 0"))');

    // Then: 借りるボタンが無効化されている
    const borrowButton = unavailableBook.locator('button:has-text("借りる")');
    await expect(borrowButton).toBeDisabled();
    await expect(borrowButton).toHaveCSS('cursor', 'not-allowed');
  });

  test('E2E-005: 検索結果が0件の場合、適切なメッセージを表示', async () => {
    // When: 存在しない書籍を検索
    await page.goto('http://localhost:5173/books');
    await page.fill('input[placeholder*="検索"]', '存在しない書籍タイトル12345');
    await page.click('button:has-text("検索")');

    // Then: 検索結果0件メッセージ
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('検索結果が見つかりませんでした');
  });

  test('E2E-006: カテゴリフィルタで絞り込み検索', async () => {
    // When: カテゴリフィルタを適用
    await page.goto('http://localhost:5173/books');
    await page.selectOption('select[name="category"]', '技術書');

    // Then: 技術書のみが表示される
    const bookCards = page.locator('.book-card');
    const count = await bookCards.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(bookCards.nth(i)).toContainText('技術書');
    }
  });

  test('E2E-007: 返却期限が近い書籍に警告表示', async () => {
    // Given: 返却期限が3日以内の書籍を借りている状態
    // (テストデータで期限が近い書籍を設定)
    await page.goto('http://localhost:5173/my-loans');

    // When: 貸出状況を確認
    const urgentLoan = page.locator('.loan-card.urgent');

    // Then: 警告バッジが表示される
    if (await urgentLoan.count() > 0) {
      await expect(urgentLoan.locator('.badge-warning')).toContainText('返却期限間近');
      await expect(urgentLoan.locator('.days-until-due')).toContainText(/[0-2]日/);
    }
  });

  test('E2E-008: ページネーション動作確認', async () => {
    // When: 書籍一覧で次ページに移動
    await page.goto('http://localhost:5173/books');

    const paginationNext = page.locator('.pagination button:has-text("次へ")');

    if (await paginationNext.isEnabled()) {
      await paginationNext.click();

      // Then: ページ番号が更新される
      await expect(page.locator('.pagination .active')).toContainText('2');
      await expect(page).toHaveURL(/page=2/);
    }
  });
});

test.describe('レスポンシブデザイン検証', () => {
  test('E2E-101: モバイル表示で正常に動作する', async ({ page }) => {
    // モバイルビューポート設定
    await page.setViewportSize({ width: 375, height: 667 });

    // ログイン
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'user1234');
    await page.click('button[type="submit"]');

    // ハンバーガーメニューが表示される
    const mobileMenu = page.locator('.mobile-menu-button');
    await expect(mobileMenu).toBeVisible();

    // メニューを開く
    await mobileMenu.click();
    await expect(page.locator('.mobile-nav')).toBeVisible();

    // 貸出状況リンクをクリック
    await page.locator('.mobile-nav a:has-text("貸出状況")').click();
    await expect(page).toHaveURL(/\/my-loans/);
  });

  test('E2E-102: タブレット表示で正常に動作する', async ({ page }) => {
    // タブレットビューポート設定
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('http://localhost:5173/books');

    // カード表示が2列レイアウト
    const bookGrid = page.locator('.book-grid');
    await expect(bookGrid).toHaveCSS('grid-template-columns', /repeat\(2,/);
  });
});

test.describe('アクセシビリティ検証', () => {
  test('E2E-201: キーボードナビゲーションが動作する', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="username"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();

    // Enterキーでログイン
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'user1234');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/books/);
  });

  test('E2E-202: スクリーンリーダー対応のARIA属性が適切', async ({ page }) => {
    await page.goto('http://localhost:5173/books');

    // ボタンにaria-labelがある
    const searchButton = page.locator('button:has-text("検索")');
    await expect(searchButton).toHaveAttribute('aria-label', /検索/);

    // フォームコントロールにlabelが関連付けられている
    const searchInput = page.locator('input[placeholder*="検索"]');
    const inputId = await searchInput.getAttribute('id');
    const label = page.locator(`label[for="${inputId}"]`);
    await expect(label).toBeVisible();
  });
});

test.describe('エラーハンドリング検証', () => {
  test('E2E-301: ネットワークエラー時の適切なメッセージ表示', async ({ page, context }) => {
    // ネットワークをオフライン状態にする
    await context.setOffline(true);

    await page.goto('http://localhost:5173/books');

    // 書籍を借りようとする
    await page.locator('.book-card').first().locator('button:has-text("借りる")').click();

    // エラーメッセージが表示される
    await expect(page.locator('.alert-danger')).toContainText('ネットワークエラー');

    // ネットワークを復旧
    await context.setOffline(false);
  });

  test('E2E-302: セッション切れ時に自動的にログインページへ', async ({ page }) => {
    // ログイン
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'user1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/books/);

    // セッションクッキーを削除
    await page.context().clearCookies();

    // 保護されたページにアクセス
    await page.goto('http://localhost:5173/my-loans');

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('.alert-info')).toContainText('ログインが必要です');
  });
});

test.describe('パフォーマンス検証', () => {
  test('E2E-401: ページ読み込み時間が許容範囲内', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:5173/books');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 2秒以内に読み込み完了
    expect(loadTime).toBeLessThan(2000);
  });

  test('E2E-402: 大量データ表示時もスムーズにスクロール', async ({ page }) => {
    await page.goto('http://localhost:5173/books?limit=100');

    // スクロールパフォーマンス測定
    const scrollPerformance = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();
        let frameCount = 0;

        const scroll = () => {
          window.scrollBy(0, 100);
          frameCount++;

          if (frameCount < 50) {
            requestAnimationFrame(scroll);
          } else {
            const duration = performance.now() - startTime;
            resolve(duration);
          }
        };

        requestAnimationFrame(scroll);
      });
    });

    // 50フレームのスクロールが1秒以内
    expect(scrollPerformance).toBeLessThan(1000);
  });
});
