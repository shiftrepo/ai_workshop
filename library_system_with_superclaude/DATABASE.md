# データベース設計書

## 1. データベース概要

### 1.1 DBMS
- **製品**: SQLite 3
- **ファイル**: `library.db`
- **文字コード**: UTF-8
- **バージョン**: 3.40.0以上

### 1.2 設計方針
- 正規化: 第3正規形まで適用
- 外部キー制約: 有効化（PRAGMA foreign_keys = ON）
- インデックス: 検索頻度の高いカラムに設定
- トランザクション: 貸出/返却処理でACID特性保証

---

## 2. ER図（Entity Relationship Diagram）

```
┌─────────────────────────────────────────────────────────────────┐
│                         ER Diagram                               │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │      users       │
    │──────────────────│
    │ PK id            │───┐
    │    username      │   │
    │    password_hash │   │
    │    email         │   │
    │    role          │   │
    │    created_at    │   │
    │    updated_at    │   │
    └──────────────────┘   │
                           │ 1
                           │
                           │ N
                           │
    ┌──────────────────┐   │       ┌──────────────────┐
    │      loans       │───┼───────│      books       │
    │──────────────────│   │       │──────────────────│
    │ PK id            │   │       │ PK id            │
    │ FK user_id       │───┘       │    isbn          │
    │ FK book_id       │───────────│    title         │
    │    loan_date     │         1 │    author        │
    │    due_date      │           │    publisher     │
    │    return_date   │           │    published_year│
    │    status        │           │    category      │
    │    created_at    │           │    total_stock   │
    └──────────────────┘           │    available_stock│
                                    │    created_at    │
                                  N │    updated_at    │
                                    └──────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
  1:N = One to Many Relationship
```

---

## 3. テーブル定義

### 3.1 usersテーブル（ユーザ情報）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|----------|----------|------|------------|------|
| id | INTEGER | NOT NULL | AUTO INCREMENT | ユーザID（主キー） |
| username | TEXT | NOT NULL | - | ログインユーザ名（一意） |
| password_hash | TEXT | NOT NULL | - | bcryptハッシュ化パスワード |
| email | TEXT | NOT NULL | - | メールアドレス（一意） |
| role | TEXT | NOT NULL | 'user' | ロール（'admin' or 'user'） |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | 作成日時（ISO 8601） |
| updated_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | 更新日時（ISO 8601） |

**制約**:
- PRIMARY KEY: id
- UNIQUE: username, email
- CHECK: role IN ('admin', 'user')

**インデックス**:
- CREATE INDEX idx_users_username ON users(username);
- CREATE INDEX idx_users_email ON users(email);

**SQL定義**:
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

---

### 3.2 booksテーブル（書籍情報）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|----------|----------|------|------------|------|
| id | INTEGER | NOT NULL | AUTO INCREMENT | 書籍ID（主キー） |
| isbn | TEXT | NOT NULL | - | ISBN（国際標準図書番号、一意） |
| title | TEXT | NOT NULL | - | 書籍タイトル |
| author | TEXT | NOT NULL | - | 著者名 |
| publisher | TEXT | NULL | - | 出版社 |
| published_year | INTEGER | NULL | - | 出版年 |
| category | TEXT | NULL | - | カテゴリ（技術書、ビジネス書等） |
| total_stock | INTEGER | NOT NULL | 1 | 総在庫数（同一書籍の冊数） |
| available_stock | INTEGER | NOT NULL | 1 | 貸出可能在庫数 |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | 登録日時 |
| updated_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- PRIMARY KEY: id
- UNIQUE: isbn
- CHECK: total_stock >= 0 AND total_stock <= 3
- CHECK: available_stock >= 0 AND available_stock <= total_stock

**インデックス**:
- CREATE INDEX idx_books_isbn ON books(isbn);
- CREATE INDEX idx_books_title ON books(title);
- CREATE INDEX idx_books_category ON books(category);

**SQL定義**:
```sql
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    published_year INTEGER,
    category TEXT,
    total_stock INTEGER NOT NULL DEFAULT 1 CHECK(total_stock >= 0 AND total_stock <= 3),
    available_stock INTEGER NOT NULL DEFAULT 1 CHECK(available_stock >= 0 AND available_stock <= total_stock),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_category ON books(category);
```

---

### 3.3 loansテーブル（貸出記録）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|----------|----------|------|------------|------|
| id | INTEGER | NOT NULL | AUTO INCREMENT | 貸出ID（主キー） |
| user_id | INTEGER | NOT NULL | - | ユーザID（外部キー） |
| book_id | INTEGER | NOT NULL | - | 書籍ID（外部キー） |
| loan_date | TEXT | NOT NULL | CURRENT_TIMESTAMP | 貸出日時 |
| due_date | TEXT | NOT NULL | - | 返却期限日時（貸出日+14日） |
| return_date | TEXT | NULL | - | 実際の返却日時 |
| status | TEXT | NOT NULL | 'borrowed' | ステータス |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

**ステータス定義**:
- `borrowed`: 貸出中
- `returned`: 返却済み
- `overdue`: 延滞中（システムが自動判定）

**制約**:
- PRIMARY KEY: id
- FOREIGN KEY: user_id REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY: book_id REFERENCES books(id) ON DELETE CASCADE
- CHECK: status IN ('borrowed', 'returned', 'overdue')

**インデックス**:
- CREATE INDEX idx_loans_user_id ON loans(user_id);
- CREATE INDEX idx_loans_book_id ON loans(book_id);
- CREATE INDEX idx_loans_status ON loans(status);
- CREATE INDEX idx_loans_loan_date ON loans(loan_date);

**SQL定義**:
```sql
CREATE TABLE loans (
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
);

CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_book_id ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_loan_date ON loans(loan_date);
```

---

## 4. リレーションシップ詳細

### 4.1 users - loans（1:N）
- 1人のユーザは複数の貸出記録を持つ
- 1つの貸出記録は1人のユーザに紐づく
- ユーザ削除時、関連する貸出記録も削除（CASCADE）

### 4.2 books - loans（1:N）
- 1冊の書籍（同一ISBN）は複数の貸出記録を持つ
- 1つの貸出記録は1冊の書籍に紐づく
- 書籍削除時、関連する貸出記録も削除（CASCADE）

---

## 5. ビジネスルール実装

### 5.1 貸出制限
```sql
-- ユーザあたり現在貸出中の書籍数チェック（最大3冊）
SELECT COUNT(*)
FROM loans
WHERE user_id = ? AND status = 'borrowed';
-- 結果が3未満であれば貸出可能
```

### 5.2 在庫管理
```sql
-- 貸出時: available_stock を -1
UPDATE books
SET available_stock = available_stock - 1,
    updated_at = datetime('now')
WHERE id = ? AND available_stock > 0;

-- 返却時: available_stock を +1
UPDATE books
SET available_stock = available_stock + 1,
    updated_at = datetime('now')
WHERE id = ?;
```

### 5.3 延滞判定
```sql
-- 現在時刻より返却期限が過ぎている借りている書籍を延滞に更新
UPDATE loans
SET status = 'overdue'
WHERE status = 'borrowed'
  AND datetime(due_date) < datetime('now')
  AND return_date IS NULL;
```

### 5.4 返却処理
```sql
-- 返却日設定とステータス更新
UPDATE loans
SET return_date = datetime('now'),
    status = 'returned'
WHERE id = ? AND status IN ('borrowed', 'overdue');
```

---

## 6. 初期データ（seed.sql）

### 6.1 管理者アカウント
```sql
-- パスワード: admin123（本番では変更必須）
INSERT INTO users (username, password_hash, email, role) VALUES
('admin', '$2b$10$HASH_HERE', 'admin@company.local', 'admin');
```

### 6.2 テストユーザ
```sql
INSERT INTO users (username, password_hash, email, role) VALUES
('user1', '$2b$10$HASH_HERE', 'user1@company.local', 'user'),
('user2', '$2b$10$HASH_HERE', 'user2@company.local', 'user');
```

### 6.3 サンプル書籍
```sql
INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES
('978-4-295-00712-7', 'リーダブルコード', 'Dustin Boswell', 'オライリー・ジャパン', 2012, '技術書', 2, 2),
('978-4-87311-704-1', 'Clean Code', 'Robert C. Martin', 'アスキー・メディアワークス', 2009, '技術書', 1, 1),
('978-4-297-11058-1', '人月の神話', 'Frederick P. Brooks Jr.', '技術評論社', 2014, '技術書', 1, 1);
```

---

## 7. データベース操作例

### 7.1 書籍検索（タイトル部分一致）
```sql
SELECT * FROM books
WHERE title LIKE '%' || ? || '%'
  AND available_stock > 0
ORDER BY title;
```

### 7.2 ユーザの現在貸出中の書籍一覧
```sql
SELECT
    l.id AS loan_id,
    b.title,
    b.author,
    l.loan_date,
    l.due_date,
    l.status
FROM loans l
INNER JOIN books b ON l.book_id = b.id
WHERE l.user_id = ?
  AND l.status IN ('borrowed', 'overdue')
ORDER BY l.due_date;
```

### 7.3 延滞中の貸出一覧（管理者用）
```sql
SELECT
    u.username,
    b.title,
    l.loan_date,
    l.due_date,
    julianday('now') - julianday(l.due_date) AS days_overdue
FROM loans l
INNER JOIN users u ON l.user_id = u.id
INNER JOIN books b ON l.book_id = b.id
WHERE l.status = 'overdue'
ORDER BY days_overdue DESC;
```

### 7.4 人気書籍ランキング（貸出回数順）
```sql
SELECT
    b.title,
    b.author,
    COUNT(l.id) AS loan_count
FROM books b
LEFT JOIN loans l ON b.id = l.book_id
GROUP BY b.id
ORDER BY loan_count DESC
LIMIT 10;
```

---

## 8. パフォーマンス最適化

### 8.1 インデックス戦略
- **検索頻度高**: username, isbn, loan_date → インデックス作成済み
- **複合インデックス検討**: (user_id, status) for loans テーブル

### 8.2 クエリ最適化
- JOINは必要最小限に
- SELECT * を避け、必要なカラムのみ指定
- COUNT(*)よりEXISTS句を検討（存在確認のみの場合）

### 8.3 PRAGMA設定
```sql
PRAGMA foreign_keys = ON;           -- 外部キー制約有効化
PRAGMA journal_mode = WAL;          -- Write-Ahead Loggingモード
PRAGMA synchronous = NORMAL;        -- 同期モード（速度とデータ安全性のバランス）
PRAGMA temp_store = MEMORY;         -- 一時テーブルをメモリに保存
PRAGMA cache_size = -64000;         -- キャッシュサイズ64MB
```

---

## 9. バックアップ戦略

### 9.1 日次バックアップ
```bash
# バックアップスクリプト例
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 /path/to/library.db ".backup /path/to/backup/library_${DATE}.db"
# 7日以上古いバックアップを削除
find /path/to/backup -name "library_*.db" -mtime +7 -delete
```

### 9.2 リストア手順
```bash
# 1. 現在のDBをリネーム
mv library.db library.db.old

# 2. バックアップファイルをコピー
cp /path/to/backup/library_YYYYMMDD_HHMMSS.db library.db

# 3. 権限設定
chmod 644 library.db
```

---

## 10. マイグレーション管理

### 10.1 マイグレーションファイル命名規則
```
migrations/
  001_initial_schema.sql
  002_add_category_to_books.sql
  003_add_index_loans_status.sql
```

### 10.2 マイグレーション実行例
```javascript
// Node.js migration runner example
const fs = require('fs');
const db = require('./db');

const migrations = fs.readdirSync('./migrations').sort();
migrations.forEach(file => {
    const sql = fs.readFileSync(`./migrations/${file}`, 'utf8');
    db.exec(sql);
    console.log(`Applied migration: ${file}`);
});
```

---

## 11. トラブルシューティング

### 11.1 データベースロック
**症状**: `database is locked` エラー
**原因**: 複数の書き込みトランザクションが同時実行
**対策**:
- WALモード有効化（PRAGMA journal_mode = WAL）
- トランザクション時間を最小化
- リトライロジック実装

### 11.2 外部キー制約違反
**症状**: `FOREIGN KEY constraint failed`
**原因**: 存在しないuser_idやbook_idを参照
**対策**:
- 挿入前に参照先レコードの存在確認
- アプリケーション層でバリデーション強化

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Software Architect Agent
