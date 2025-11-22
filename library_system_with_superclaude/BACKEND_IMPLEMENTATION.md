# Node.js + Express + SQLite バックエンド実装ガイド

**対象読者**: バックエンドエンジニア
**前提知識**: Node.js基礎、ES6+、SQL基礎、REST API
**実装時間**: 約8-12時間

---

## 目次

1. [プロジェクトセットアップ](#1-プロジェクトセットアップ)
2. [ディレクトリ構造構築](#2-ディレクトリ構造構築)
3. [データベース層実装](#3-データベース層実装)
4. [認証システム実装](#4-認証システム実装)
5. [ミドルウェア実装](#5-ミドルウェア実装)
6. [Repositoryパターン実装](#6-repositoryパターン実装)
7. [Service層実装](#7-service層実装)
8. [Controller層実装](#8-controller層実装)
9. [ルーティング設定](#9-ルーティング設定)
10. [エラーハンドリング](#10-エラーハンドリング)
11. [テスト実装](#11-テスト実装)
12. [起動・デプロイ](#12-起動デプロイ)

---

## 1. プロジェクトセットアップ

### 1.1 初期化

```bash
# プロジェクトルート作成
cd /root/ai_workshop/library_system_with_superclaude
mkdir -p server
cd server

# package.json初期化
npm init -y
```

### 1.2 依存パッケージインストール

```bash
# 本番依存
npm install express sqlite3 express-session connect-sqlite3 \
  bcrypt express-validator helmet cors winston \
  dotenv express-rate-limit csurf

# 開発依存
npm install --save-dev nodemon jest supertest eslint prettier
```

### 1.3 package.json設定

**server/package.json**:
```json
{
  "name": "library-api",
  "version": "1.0.0",
  "description": "Library Management System Backend",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.js",
    "db:init": "node scripts/initDatabase.js",
    "db:seed": "node scripts/seedDatabase.js"
  },
  "keywords": ["library", "api", "express"],
  "author": "Backend Team",
  "license": "MIT"
}
```

### 1.4 ESLint設定

**server/.eslintrc.json**:
```json
{
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  }
}
```

### 1.5 環境変数設定

**server/.env.example**:
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DATABASE_PATH=./data/library.db
SESSIONS_DB_PATH=./data/sessions.db

# Session Configuration
SESSION_SECRET=CHANGE_THIS_IN_PRODUCTION_TO_A_RANDOM_STRING_AT_LEAST_32_CHARS
SESSION_MAX_AGE=1800000

# Security
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=10

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# SQLite PRAGMA
SQLITE_JOURNAL_MODE=WAL
SQLITE_SYNCHRONOUS=NORMAL
SQLITE_CACHE_SIZE=-64000
```

**セットアップ手順**:
```bash
cp .env.example .env
# 本番環境では SESSION_SECRET を必ず変更
# SESSION_SECRET=$(openssl rand -base64 32)
```

---

## 2. ディレクトリ構造構築

### 2.1 ディレクトリ作成

```bash
cd /root/ai_workshop/library_system_with_superclaude/server

mkdir -p src/config
mkdir -p src/middleware
mkdir -p src/controllers
mkdir -p src/services
mkdir -p src/repositories
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/utils
mkdir -p src/db/migrations
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p scripts
mkdir -p logs
mkdir -p data
```

### 2.2 最終ディレクトリ構造

```
server/
├── src/
│   ├── config/
│   │   ├── database.js          # SQLite接続設定
│   │   ├── session.js           # セッション設定
│   │   └── constants.js         # 定数定義
│   ├── middleware/
│   │   ├── auth.js              # 認証ミドルウェア
│   │   ├── errorHandler.js      # エラーハンドリング
│   │   ├── validator.js         # バリデーション
│   │   └── rateLimiter.js       # レート制限
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── bookController.js
│   │   └── loanController.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── bookService.js
│   │   └── loanService.js
│   ├── repositories/
│   │   ├── userRepository.js
│   │   ├── bookRepository.js
│   │   └── loanRepository.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Book.js
│   │   └── Loan.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── bookRoutes.js
│   │   └── loanRoutes.js
│   ├── utils/
│   │   ├── passwordHash.js      # パスワードハッシュ
│   │   ├── logger.js            # ロギング
│   │   └── dateUtils.js         # 日付操作
│   ├── db/
│   │   ├── schema.sql           # テーブル定義
│   │   ├── seed.sql             # 初期データ
│   │   └── migrations/
│   │       └── 001_initial.sql
│   ├── app.js                   # Expressアプリ設定
│   └── server.js                # サーバー起動
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── repositories/
│   └── integration/
│       └── api/
├── scripts/
│   ├── initDatabase.js          # DB初期化
│   └── seedDatabase.js          # seedデータ投入
├── logs/                        # ログファイル
├── data/                        # SQLiteファイル
│   ├── library.db
│   └── sessions.db
├── .env.example
├── .env
├── .gitignore
├── .eslintrc.json
└── package.json
```

---

## 3. データベース層実装

### 3.1 データベース接続設定

**src/config/database.js**:
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DATABASE_PATH || './data/library.db');

// データベース接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database:', dbPath);
});

// PRAGMA設定（パフォーマンス最適化）
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`PRAGMA journal_mode = ${process.env.SQLITE_JOURNAL_MODE || 'WAL'}`);
  db.run(`PRAGMA synchronous = ${process.env.SQLITE_SYNCHRONOUS || 'NORMAL'}`);
  db.run('PRAGMA temp_store = MEMORY');
  db.run(`PRAGMA cache_size = ${process.env.SQLITE_CACHE_SIZE || -64000}`);
});

// Promise化ヘルパー関数
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = db;
```

### 3.2 テーブル定義SQL

**src/db/schema.sql**:
```sql
-- ユーザテーブル
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 書籍テーブル
CREATE TABLE IF NOT EXISTS books (
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

CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);

-- 貸出テーブル
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
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_book_id ON loans(book_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_loan_date ON loans(loan_date);

-- updated_at自動更新トリガー（users）
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- updated_at自動更新トリガー（books）
CREATE TRIGGER IF NOT EXISTS update_books_timestamp
AFTER UPDATE ON books
FOR EACH ROW
BEGIN
    UPDATE books SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

### 3.3 初期データ（Seed）

**src/db/seed.sql**:
```sql
-- 管理者ユーザ（パスワード: admin123）
INSERT OR IGNORE INTO users (username, password_hash, email, role) VALUES
('admin', '$2b$10$ZmqGk7J2dLxkYBQ0.z/HwOYhxYvLJxB9P9FKmYJKLH8B.HhKJQK7i', 'admin@company.local', 'admin');

-- テストユーザ（パスワード: user1234）
INSERT OR IGNORE INTO users (username, password_hash, email, role) VALUES
('user1', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ', 'user1@company.local', 'user'),
('user2', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ', 'user2@company.local', 'user');

-- サンプル書籍
INSERT OR IGNORE INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock) VALUES
('978-4-295-00712-7', 'リーダブルコード', 'Dustin Boswell', 'オライリー・ジャパン', 2012, '技術書', 2, 2),
('978-4-87311-704-1', 'Clean Code', 'Robert C. Martin', 'アスキー・メディアワークス', 2009, '技術書', 1, 1),
('978-4-297-11058-1', '人月の神話', 'Frederick P. Brooks Jr.', '技術評論社', 2014, '技術書', 1, 1),
('978-4-7981-5757-3', 'プログラマが知るべき97のこと', '和田卓人', '翔泳社', 2010, '技術書', 1, 1),
('978-4-274-06885-0', 'リファクタリング', 'Martin Fowler', 'オーム社', 2014, '技術書', 1, 1);
```

### 3.4 データベース初期化スクリプト

**scripts/initDatabase.js**:
```javascript
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const dbPath = path.resolve(process.env.DATABASE_PATH || './data/library.db');
const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');

// dataディレクトリ作成
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 既存DBがあれば削除（初回のみ）
if (fs.existsSync(dbPath)) {
  console.log('Existing database found. Removing...');
  fs.unlinkSync(dbPath);
}

// 新規DB作成
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database creation error:', err.message);
    process.exit(1);
  }
  console.log('Database created:', dbPath);
});

// スキーマ実行
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema, (err) => {
  if (err) {
    console.error('Schema execution error:', err.message);
    process.exit(1);
  }
  console.log('Schema applied successfully.');
  db.close((err) => {
    if (err) console.error(err.message);
    console.log('Database initialization complete.');
  });
});
```

**scripts/seedDatabase.js**:
```javascript
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const dbPath = path.resolve(process.env.DATABASE_PATH || './data/library.db');
const seedPath = path.resolve(__dirname, '../src/db/seed.sql');

if (!fs.existsSync(dbPath)) {
  console.error('Database not found. Run npm run db:init first.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);
const seed = fs.readFileSync(seedPath, 'utf8');

db.exec(seed, (err) => {
  if (err) {
    console.error('Seed execution error:', err.message);
    process.exit(1);
  }
  console.log('Seed data inserted successfully.');
  db.close();
});
```

**実行**:
```bash
npm run db:init    # データベース初期化
npm run db:seed    # 初期データ投入
```

---

## 4. 認証システム実装

### 4.1 パスワードハッシュユーティリティ

**src/utils/passwordHash.js**:
```javascript
const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || 10);

/**
 * パスワードをハッシュ化
 * @param {string} password - 平文パスワード
 * @returns {Promise<string>} ハッシュ化されたパスワード
 */
exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * パスワードを検証
 * @param {string} password - 入力された平文パスワード
 * @param {string} hash - データベース内のハッシュ
 * @returns {Promise<boolean>} 一致するか
 */
exports.verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * パスワードの強度検証
 * @param {string} password - 検証するパスワード
 * @param {string} username - ユーザ名（同一チェック用）
 * @returns {Object} { valid: boolean, message: string }
 */
exports.validatePasswordStrength = (password, username = '') => {
  // 長さチェック
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上必要です' };
  }

  // 英字と数字を含むかチェック
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: 'パスワードは英字と数字を含む必要があります' };
  }

  // ユーザ名と同一チェック
  if (username && password.toLowerCase() === username.toLowerCase()) {
    return { valid: false, message: 'パスワードにユーザ名を使用できません' };
  }

  // 弱いパスワードチェック
  const weakPasswords = [
    'password', '12345678', 'admin123', 'user1234',
    'qwerty', 'abc123', 'password123'
  ];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'このパスワードは使用できません' };
  }

  return { valid: true };
};
```

### 4.2 セッション設定

**src/config/session.js**:
```javascript
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
require('dotenv').config();

const sessionConfig = {
  store: new SQLiteStore({
    db: path.basename(process.env.SESSIONS_DB_PATH || 'sessions.db'),
    dir: path.dirname(process.env.SESSIONS_DB_PATH || './data'),
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'CHANGE_THIS_SECRET',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || 1800000) // 30分
  },
  name: 'sessionId',
  rolling: true
};

// 本番環境でSECRETが未設定の場合エラー
if (process.env.NODE_ENV === 'production' && sessionConfig.secret === 'CHANGE_THIS_SECRET') {
  throw new Error('SESSION_SECRET must be set in production environment');
}

module.exports = sessionConfig;
```

### 4.3 認証ミドルウェア

**src/middleware/auth.js**:
```javascript
/**
 * セッション認証を確認
 */
exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です。ログインしてください。'
      }
    });
  }

  req.user = req.session.user;
  next();
};

/**
 * 管理者権限チェック
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です。'
      }
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '管理者権限が必要です。'
      }
    });
  }

  req.user = req.session.user;
  next();
};

/**
 * 自分の情報または管理者のみアクセス可能
 */
exports.requireOwnerOrAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です。'
      }
    });
  }

  const userId = parseInt(req.params.id);
  const currentUser = req.session.user;

  if (currentUser.id !== userId && currentUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'アクセス権限がありません。'
      }
    });
  }

  req.user = currentUser;
  next();
};
```

---

## 5. ミドルウェア実装

### 5.1 バリデーションミドルウェア

**src/middleware/validator.js**:
```javascript
const { body, param, query, validationResult } = require('express-validator');

/**
 * バリデーションエラーハンドラー
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * ユーザ登録バリデーション
 */
exports.validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('ユーザ名は3-20文字で入力してください')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('ユーザ名は英数字とアンダースコアのみ使用できます'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上必要です')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('パスワードは英字と数字を含む必要があります'),

  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * ログインバリデーション
 */
exports.validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('ユーザ名を入力してください'),

  body('password')
    .notEmpty()
    .withMessage('パスワードを入力してください'),

  handleValidationErrors
];

/**
 * 書籍登録バリデーション
 */
exports.validateBookCreate = [
  body('isbn')
    .trim()
    .notEmpty()
    .withMessage('ISBNを入力してください')
    .matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)/)
    .withMessage('有効なISBN形式で入力してください'),

  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('タイトルは1-200文字で入力してください'),

  body('author')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('著者名は1-100文字で入力してください'),

  body('total_stock')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('在庫数は1-3の範囲で指定してください'),

  handleValidationErrors
];

/**
 * 貸出作成バリデーション
 */
exports.validateLoanCreate = [
  body('book_id')
    .isInt({ min: 1 })
    .withMessage('有効な書籍IDを指定してください'),

  handleValidationErrors
];

/**
 * IDパラメータバリデーション
 */
exports.validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('有効なIDを指定してください'),

  handleValidationErrors
];

/**
 * ページネーションバリデーション
 */
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ページ番号は1以上の整数を指定してください'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('1ページあたりの件数は1-100の範囲で指定してください'),

  handleValidationErrors
];
```

### 5.2 レート制限ミドルウェア

**src/middleware/rateLimiter.js**:
```javascript
const rateLimit = require('express-rate-limit');

/**
 * ログインエンドポイント用レート制限
 */
exports.loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000), // 1分
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || 5),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'ログイン試行が多すぎます。しばらくしてから再試行してください。'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * 一般API用レート制限
 */
exports.apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'リクエストが多すぎます。しばらくしてから再試行してください。'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### 5.3 エラーハンドリングミドルウェア

**src/middleware/errorHandler.js**:
```javascript
const logger = require('../utils/logger');

/**
 * 404エラーハンドラー
 */
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'リクエストされたリソースが見つかりません',
      path: req.originalUrl
    }
  });
};

/**
 * グローバルエラーハンドラー
 */
exports.errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // バリデーションエラー
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message
      }
    });
  }

  // SQLiteエラー
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'データベースエラーが発生しました'
      }
    });
  }

  // その他のエラー
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'サーバーエラーが発生しました'
        : err.message
    }
  });
};
```

### 5.4 ロガー実装

**src/utils/logger.js**:
```javascript
const winston = require('winston');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logDir = process.env.LOG_DIR || './logs';

// ログディレクトリ作成
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// 開発環境ではコンソール出力も追加
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

---

## 6. Repositoryパターン実装

### 6.1 ユーザRepository

**src/repositories/userRepository.js**:
```javascript
const db = require('../config/database');

/**
 * ユーザを作成
 */
exports.create = async (userData) => {
  const { username, password_hash, email, role } = userData;
  const sql = `
    INSERT INTO users (username, password_hash, email, role)
    VALUES (?, ?, ?, ?)
  `;
  const result = await db.runAsync(sql, [username, password_hash, email, role || 'user']);
  return result.lastID;
};

/**
 * ユーザ名でユーザを検索
 */
exports.findByUsername = async (username) => {
  const sql = 'SELECT * FROM users WHERE username = ?';
  return await db.getAsync(sql, [username]);
};

/**
 * メールアドレスでユーザを検索
 */
exports.findByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = ?';
  return await db.getAsync(sql, [email]);
};

/**
 * IDでユーザを検索
 */
exports.findById = async (id) => {
  const sql = 'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?';
  return await db.getAsync(sql, [id]);
};

/**
 * ユーザ一覧を取得（ページネーション）
 */
exports.findAll = async ({ page = 1, limit = 20, role = null }) => {
  const offset = (page - 1) * limit;
  let sql = 'SELECT id, username, email, role, created_at FROM users';
  const params = [];

  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const users = await db.allAsync(sql, params);

  // 総件数取得
  let countSql = 'SELECT COUNT(*) as count FROM users';
  if (role) {
    countSql += ' WHERE role = ?';
  }
  const countResult = await db.getAsync(countSql, role ? [role] : []);
  const totalCount = countResult.count;

  return {
    users,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(totalCount / limit),
      total_count: totalCount,
      limit
    }
  };
};

/**
 * ユーザ情報を更新
 */
exports.update = async (id, userData) => {
  const { email, password_hash } = userData;
  let sql = 'UPDATE users SET email = ?';
  const params = [email];

  if (password_hash) {
    sql += ', password_hash = ?';
    params.push(password_hash);
  }

  sql += ' WHERE id = ?';
  params.push(id);

  const result = await db.runAsync(sql, params);
  return result.changes > 0;
};

/**
 * ユーザを削除
 */
exports.delete = async (id) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  const result = await db.runAsync(sql, [id]);
  return result.changes > 0;
};

/**
 * ユーザの貸出中書籍数を取得
 */
exports.getActiveLoanCount = async (userId) => {
  const sql = `
    SELECT COUNT(*) as count
    FROM loans
    WHERE user_id = ? AND status = 'borrowed'
  `;
  const result = await db.getAsync(sql, [userId]);
  return result.count;
};
```

### 6.2 書籍Repository

**src/repositories/bookRepository.js**:
```javascript
const db = require('../config/database');

/**
 * 書籍を作成
 */
exports.create = async (bookData) => {
  const { isbn, title, author, publisher, published_year, category, total_stock } = bookData;
  const sql = `
    INSERT INTO books (isbn, title, author, publisher, published_year, category, total_stock, available_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const stock = total_stock || 1;
  const result = await db.runAsync(sql, [
    isbn, title, author, publisher, published_year, category, stock, stock
  ]);
  return result.lastID;
};

/**
 * 書籍一覧を取得（検索・ページネーション）
 */
exports.findAll = async ({ page = 1, limit = 20, search = '', category = null, available_only = false }) => {
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  // 検索条件
  if (search) {
    sql += ' AND (title LIKE ? OR author LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // カテゴリフィルタ
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  // 貸出可能のみ
  if (available_only) {
    sql += ' AND available_stock > 0';
  }

  sql += ' ORDER BY title LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const books = await db.allAsync(sql, params);

  // 総件数取得
  let countSql = 'SELECT COUNT(*) as count FROM books WHERE 1=1';
  const countParams = [];
  if (search) {
    countSql += ' AND (title LIKE ? OR author LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    countSql += ' AND category = ?';
    countParams.push(category);
  }
  if (available_only) {
    countSql += ' AND available_stock > 0';
  }

  const countResult = await db.getAsync(countSql, countParams);
  const totalCount = countResult.count;

  return {
    books,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(totalCount / limit),
      total_count: totalCount,
      limit
    }
  };
};

/**
 * IDで書籍を検索
 */
exports.findById = async (id) => {
  const sql = 'SELECT * FROM books WHERE id = ?';
  return await db.getAsync(sql, [id]);
};

/**
 * ISBNで書籍を検索
 */
exports.findByIsbn = async (isbn) => {
  const sql = 'SELECT * FROM books WHERE isbn = ?';
  return await db.getAsync(sql, [isbn]);
};

/**
 * 書籍情報を更新
 */
exports.update = async (id, bookData) => {
  const fields = [];
  const params = [];

  Object.keys(bookData).forEach(key => {
    if (bookData[key] !== undefined && key !== 'id') {
      fields.push(`${key} = ?`);
      params.push(bookData[key]);
    }
  });

  if (fields.length === 0) return false;

  params.push(id);
  const sql = `UPDATE books SET ${fields.join(', ')} WHERE id = ?`;
  const result = await db.runAsync(sql, params);
  return result.changes > 0;
};

/**
 * 在庫数を更新
 */
exports.updateStock = async (id, delta) => {
  const sql = `
    UPDATE books
    SET available_stock = available_stock + ?
    WHERE id = ?
  `;
  const result = await db.runAsync(sql, [delta, id]);
  return result.changes > 0;
};

/**
 * 書籍を削除
 */
exports.delete = async (id) => {
  const sql = 'DELETE FROM books WHERE id = ?';
  const result = await db.runAsync(sql, [id]);
  return result.changes > 0;
};

/**
 * 書籍の貸出中件数を取得
 */
exports.getActiveLoanCount = async (bookId) => {
  const sql = `
    SELECT COUNT(*) as count
    FROM loans
    WHERE book_id = ? AND status = 'borrowed'
  `;
  const result = await db.getAsync(sql, [bookId]);
  return result.count;
};

/**
 * カテゴリ一覧を取得
 */
exports.getCategories = async () => {
  const sql = `
    SELECT category, COUNT(*) as count
    FROM books
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  `;
  return await db.allAsync(sql);
};
```

### 6.3 貸出Repository

**src/repositories/loanRepository.js**:
```javascript
const db = require('../config/database');

/**
 * 貸出を作成
 */
exports.create = async (loanData) => {
  const { user_id, book_id, due_date } = loanData;
  const sql = `
    INSERT INTO loans (user_id, book_id, due_date)
    VALUES (?, ?, ?)
  `;
  const result = await db.runAsync(sql, [user_id, book_id, due_date]);
  return result.lastID;
};

/**
 * 貸出一覧を取得
 */
exports.findAll = async ({ page = 1, limit = 20, user_id = null, status = null }) => {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT l.*, u.username, b.title, b.author, b.isbn
    FROM loans l
    INNER JOIN users u ON l.user_id = u.id
    INNER JOIN books b ON l.book_id = b.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    sql += ' AND l.user_id = ?';
    params.push(user_id);
  }

  if (status) {
    sql += ' AND l.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY l.loan_date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const loans = await db.allAsync(sql, params);

  // 総件数取得
  let countSql = 'SELECT COUNT(*) as count FROM loans WHERE 1=1';
  const countParams = [];
  if (user_id) {
    countSql += ' AND user_id = ?';
    countParams.push(user_id);
  }
  if (status) {
    countSql += ' AND status = ?';
    countParams.push(status);
  }

  const countResult = await db.getAsync(countSql, countParams);
  const totalCount = countResult.count;

  return {
    loans,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(totalCount / limit),
      total_count: totalCount,
      limit
    }
  };
};

/**
 * IDで貸出を検索
 */
exports.findById = async (id) => {
  const sql = `
    SELECT l.*, u.username, b.title, b.author
    FROM loans l
    INNER JOIN users u ON l.user_id = u.id
    INNER JOIN books b ON l.book_id = b.id
    WHERE l.id = ?
  `;
  return await db.getAsync(sql, [id]);
};

/**
 * ユーザの貸出中書籍を取得
 */
exports.findActiveByUser = async (userId) => {
  const sql = `
    SELECT l.*, b.title, b.author
    FROM loans l
    INNER JOIN books b ON l.book_id = b.id
    WHERE l.user_id = ? AND l.status = 'borrowed'
    ORDER BY l.due_date
  `;
  return await db.allAsync(sql, [userId]);
};

/**
 * 返却処理
 */
exports.return = async (id) => {
  const sql = `
    UPDATE loans
    SET return_date = datetime('now'), status = 'returned'
    WHERE id = ? AND status IN ('borrowed', 'overdue')
  `;
  const result = await db.runAsync(sql, [id]);
  return result.changes > 0;
};

/**
 * 延滞書籍一覧を取得
 */
exports.findOverdue = async () => {
  const sql = `
    SELECT l.*, u.username, u.email, b.title, b.author,
           julianday('now') - julianday(l.due_date) as days_overdue
    FROM loans l
    INNER JOIN users u ON l.user_id = u.id
    INNER JOIN books b ON l.book_id = b.id
    WHERE l.status = 'overdue'
    ORDER BY days_overdue DESC
  `;
  return await db.allAsync(sql);
};

/**
 * 延滞ステータスを更新
 */
exports.updateOverdueStatus = async () => {
  const sql = `
    UPDATE loans
    SET status = 'overdue'
    WHERE status = 'borrowed'
      AND datetime(due_date) < datetime('now')
      AND return_date IS NULL
  `;
  const result = await db.runAsync(sql);
  return result.changes;
};

/**
 * 同一ユーザ・書籍の重複貸出チェック
 */
exports.hasDuplicateLoan = async (userId, bookId) => {
  const sql = `
    SELECT COUNT(*) as count
    FROM loans
    WHERE user_id = ? AND book_id = ? AND status = 'borrowed'
  `;
  const result = await db.getAsync(sql, [userId, bookId]);
  return result.count > 0;
};
```

---

## 7. Service層実装

### 7.1 認証Service

**src/services/authService.js**:
```javascript
const userRepository = require('../repositories/userRepository');
const { verifyPassword } = require('../utils/passwordHash');
const logger = require('../utils/logger');

/**
 * ユーザ認証
 */
exports.authenticate = async (username, password) => {
  const user = await userRepository.findByUsername(username);

  if (!user) {
    logger.warn({ event: 'LOGIN_FAILED', username, reason: 'User not found' });
    return null;
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    logger.warn({ event: 'LOGIN_FAILED', username, reason: 'Invalid password' });
    return null;
  }

  logger.info({ event: 'LOGIN_SUCCESS', userId: user.id, username });

  // パスワードハッシュを除外して返却
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * セッション情報取得
 */
exports.getSessionUser = (req) => {
  if (!req.session || !req.session.user) {
    return null;
  }
  return req.session.user;
};
```

### 7.2 ユーザService

**src/services/userService.js**:
```javascript
const userRepository = require('../repositories/userRepository');
const { hashPassword, validatePasswordStrength } = require('../utils/passwordHash');

/**
 * ユーザ登録
 */
exports.register = async (userData) => {
  const { username, password, email } = userData;

  // パスワード強度検証
  const passwordValidation = validatePasswordStrength(password, username);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }

  // ユーザ名重複チェック
  const existingUser = await userRepository.findByUsername(username);
  if (existingUser) {
    const error = new Error('このユーザ名は既に使用されています');
    error.code = 'USERNAME_ALREADY_EXISTS';
    error.statusCode = 409;
    throw error;
  }

  // メール重複チェック
  const existingEmail = await userRepository.findByEmail(email);
  if (existingEmail) {
    const error = new Error('このメールアドレスは既に使用されています');
    error.code = 'EMAIL_ALREADY_EXISTS';
    error.statusCode = 409;
    throw error;
  }

  // パスワードハッシュ化
  const password_hash = await hashPassword(password);

  // ユーザ作成
  const userId = await userRepository.create({
    username,
    password_hash,
    email,
    role: 'user'
  });

  // 作成したユーザを返却
  return await userRepository.findById(userId);
};

/**
 * ユーザ一覧取得
 */
exports.getUsers = async (options) => {
  return await userRepository.findAll(options);
};

/**
 * ユーザ詳細取得
 */
exports.getUserById = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    const error = new Error('ユーザが見つかりません');
    error.code = 'USER_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  return user;
};

/**
 * ユーザ情報更新
 */
exports.updateUser = async (id, userData) => {
  const { email, password } = userData;

  // メール重複チェック（自分以外）
  if (email) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail && existingEmail.id !== id) {
      const error = new Error('このメールアドレスは既に使用されています');
      error.code = 'EMAIL_ALREADY_EXISTS';
      error.statusCode = 409;
      throw error;
    }
  }

  const updateData = { email };

  // パスワード変更がある場合
  if (password) {
    const user = await userRepository.findById(id);
    const passwordValidation = validatePasswordStrength(password, user.username);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }
    updateData.password_hash = await hashPassword(password);
  }

  const updated = await userRepository.update(id, updateData);
  if (!updated) {
    const error = new Error('ユーザ情報の更新に失敗しました');
    error.statusCode = 500;
    throw error;
  }

  return await userRepository.findById(id);
};

/**
 * ユーザ削除
 */
exports.deleteUser = async (id) => {
  // 貸出中の書籍がないかチェック
  const loanCount = await userRepository.getActiveLoanCount(id);
  if (loanCount > 0) {
    const error = new Error('貸出中の書籍があるため削除できません');
    error.code = 'USER_HAS_ACTIVE_LOANS';
    error.statusCode = 409;
    error.details = { active_loans_count: loanCount };
    throw error;
  }

  const deleted = await userRepository.delete(id);
  if (!deleted) {
    const error = new Error('ユーザの削除に失敗しました');
    error.statusCode = 500;
    throw error;
  }

  return true;
};
```

### 7.3 書籍Service

**src/services/bookService.js**:
```javascript
const bookRepository = require('../repositories/bookRepository');

/**
 * 書籍登録
 */
exports.createBook = async (bookData) => {
  const { isbn } = bookData;

  // ISBN重複チェック
  const existingBook = await bookRepository.findByIsbn(isbn);
  if (existingBook) {
    const error = new Error('このISBNは既に登録されています');
    error.code = 'ISBN_ALREADY_EXISTS';
    error.statusCode = 409;
    throw error;
  }

  const bookId = await bookRepository.create(bookData);
  return await bookRepository.findById(bookId);
};

/**
 * 書籍一覧取得
 */
exports.getBooks = async (options) => {
  return await bookRepository.findAll(options);
};

/**
 * 書籍詳細取得
 */
exports.getBookById = async (id) => {
  const book = await bookRepository.findById(id);
  if (!book) {
    const error = new Error('書籍が見つかりません');
    error.code = 'BOOK_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  return book;
};

/**
 * 書籍情報更新
 */
exports.updateBook = async (id, bookData) => {
  const book = await bookRepository.findById(id);
  if (!book) {
    const error = new Error('書籍が見つかりません');
    error.code = 'BOOK_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // total_stock変更時、available_stockも調整
  if (bookData.total_stock !== undefined) {
    const borrowedCount = book.total_stock - book.available_stock;
    bookData.available_stock = Math.max(0, bookData.total_stock - borrowedCount);
  }

  const updated = await bookRepository.update(id, bookData);
  if (!updated) {
    const error = new Error('書籍情報の更新に失敗しました');
    error.statusCode = 500;
    throw error;
  }

  return await bookRepository.findById(id);
};

/**
 * 書籍削除
 */
exports.deleteBook = async (id) => {
  // 貸出中でないかチェック
  const loanCount = await bookRepository.getActiveLoanCount(id);
  if (loanCount > 0) {
    const error = new Error('貸出中のため削除できません');
    error.code = 'BOOK_HAS_ACTIVE_LOANS';
    error.statusCode = 409;
    error.details = { active_loans_count: loanCount };
    throw error;
  }

  const deleted = await bookRepository.delete(id);
  if (!deleted) {
    const error = new Error('書籍の削除に失敗しました');
    error.statusCode = 500;
    throw error;
  }

  return true;
};

/**
 * カテゴリ一覧取得
 */
exports.getCategories = async () => {
  return await bookRepository.getCategories();
};
```

### 7.4 貸出Service

**src/services/loanService.js**:
```javascript
const loanRepository = require('../repositories/loanRepository');
const bookRepository = require('../repositories/bookRepository');
const userRepository = require('../repositories/userRepository');

const MAX_LOANS = 3;
const LOAN_PERIOD_DAYS = 14;

/**
 * 書籍を借りる
 */
exports.createLoan = async (userId, bookId) => {
  // ユーザの貸出上限チェック
  const userLoanCount = await userRepository.getActiveLoanCount(userId);
  if (userLoanCount >= MAX_LOANS) {
    const error = new Error('貸出上限（3冊）に達しています');
    error.code = 'LOAN_LIMIT_EXCEEDED';
    error.statusCode = 409;
    error.details = { current_loans: userLoanCount, max_loans: MAX_LOANS };
    throw error;
  }

  // 書籍の在庫チェック
  const book = await bookRepository.findById(bookId);
  if (!book) {
    const error = new Error('書籍が見つかりません');
    error.code = 'BOOK_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  if (book.available_stock <= 0) {
    const error = new Error('この書籍は現在貸出中です');
    error.code = 'BOOK_NOT_AVAILABLE';
    error.statusCode = 409;
    error.details = { available_stock: 0 };
    throw error;
  }

  // 重複貸出チェック
  const hasDuplicate = await loanRepository.hasDuplicateLoan(userId, bookId);
  if (hasDuplicate) {
    const error = new Error('この書籍は既に借りています');
    error.code = 'DUPLICATE_LOAN';
    error.statusCode = 409;
    throw error;
  }

  // 返却期限計算
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
  const dueDateISO = dueDate.toISOString().replace('T', ' ').substring(0, 19);

  // 貸出作成
  const loanId = await loanRepository.create({
    user_id: userId,
    book_id: bookId,
    due_date: dueDateISO
  });

  // 在庫減少
  await bookRepository.updateStock(bookId, -1);

  return await loanRepository.findById(loanId);
};

/**
 * 書籍を返却する
 */
exports.returnLoan = async (loanId, userId, isAdmin = false) => {
  const loan = await loanRepository.findById(loanId);

  if (!loan) {
    const error = new Error('貸出記録が見つかりません');
    error.code = 'LOAN_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // 権限チェック（自分の貸出または管理者のみ）
  if (!isAdmin && loan.user_id !== userId) {
    const error = new Error('この貸出記録にアクセスする権限がありません');
    error.code = 'FORBIDDEN';
    error.statusCode = 403;
    throw error;
  }

  if (loan.status === 'returned') {
    const error = new Error('この書籍は既に返却済みです');
    error.code = 'LOAN_ALREADY_RETURNED';
    error.statusCode = 409;
    throw error;
  }

  // 返却処理
  const returned = await loanRepository.return(loanId);
  if (!returned) {
    const error = new Error('返却処理に失敗しました');
    error.statusCode = 500;
    throw error;
  }

  // 在庫増加
  await bookRepository.updateStock(loan.book_id, 1);

  return await loanRepository.findById(loanId);
};

/**
 * 貸出一覧取得
 */
exports.getLoans = async (options) => {
  return await loanRepository.findAll(options);
};

/**
 * ユーザの貸出中書籍取得
 */
exports.getMyLoans = async (userId) => {
  const loans = await loanRepository.findActiveByUser(userId);
  const loanCount = loans.length;

  return {
    loans,
    summary: {
      total_borrowed: loanCount,
      max_allowed: MAX_LOANS,
      available_slots: MAX_LOANS - loanCount
    }
  };
};

/**
 * 延滞書籍一覧取得
 */
exports.getOverdueLoans = async () => {
  // 延滞ステータス更新
  await loanRepository.updateOverdueStatus();

  const overdueLoans = await loanRepository.findOverdue();
  const uniqueUsers = new Set(overdueLoans.map(loan => loan.user_id)).size;

  return {
    overdue_loans: overdueLoans,
    summary: {
      total_overdue: overdueLoans.length,
      total_overdue_users: uniqueUsers
    }
  };
};
```

---

## 8. Controller層実装

### 8.1 認証Controller

**src/controllers/authController.js**:
```javascript
const authService = require('../services/authService');
const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * ユーザ登録
 */
exports.register = async (req, res, next) => {
  try {
    const user = await userService.register(req.body);

    res.status(201).json({
      success: true,
      data: { user },
      message: 'ユーザ登録が完了しました'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ログイン
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await authService.authenticate(username, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'ユーザ名またはパスワードが正しくありません'
        }
      });
    }

    // セッションID再生成（セッション固定攻撃対策）
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration error:', err);
        return next(err);
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      req.session.save((err) => {
        if (err) {
          logger.error('Session save error:', err);
          return next(err);
        }

        res.json({
          success: true,
          data: { user },
          message: 'ログインしました'
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ログアウト
 */
exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error:', err);
      return next(err);
    }

    res.clearCookie('sessionId');
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
};

/**
 * セッション確認
 */
exports.me = (req, res) => {
  const user = authService.getSessionUser(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です'
      }
    });
  }

  res.json({
    success: true,
    data: { user }
  });
};
```

### 8.2 ユーザController

**src/controllers/userController.js**:
```javascript
const userService = require('../services/userService');

/**
 * ユーザ一覧取得
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, role } = req.query;
    const result = await userService.getUsers({ page, limit, role });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ユーザ詳細取得
 */
exports.getById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(parseInt(req.params.id));

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ユーザ情報更新
 */
exports.update = async (req, res, next) => {
  try {
    const user = await userService.updateUser(parseInt(req.params.id), req.body);

    res.json({
      success: true,
      data: { user },
      message: 'ユーザ情報を更新しました'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ユーザ削除
 */
exports.delete = async (req, res, next) => {
  try {
    await userService.deleteUser(parseInt(req.params.id));

    res.json({
      success: true,
      message: 'ユーザを削除しました'
    });
  } catch (error) {
    next(error);
  }
};
```

### 8.3 書籍Controller

**src/controllers/bookController.js**:
```javascript
const bookService = require('../services/bookService');

/**
 * 書籍一覧取得
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, search, category, available_only } = req.query;
    const result = await bookService.getBooks({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      category,
      available_only: available_only === 'true'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 書籍詳細取得
 */
exports.getById = async (req, res, next) => {
  try {
    const book = await bookService.getBookById(parseInt(req.params.id));

    res.json({
      success: true,
      data: { book }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 書籍登録
 */
exports.create = async (req, res, next) => {
  try {
    const book = await bookService.createBook(req.body);

    res.status(201).json({
      success: true,
      data: { book },
      message: '書籍を登録しました'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 書籍情報更新
 */
exports.update = async (req, res, next) => {
  try {
    const book = await bookService.updateBook(parseInt(req.params.id), req.body);

    res.json({
      success: true,
      data: { book },
      message: '書籍情報を更新しました'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 書籍削除
 */
exports.delete = async (req, res, next) => {
  try {
    await bookService.deleteBook(parseInt(req.params.id));

    res.json({
      success: true,
      message: '書籍を削除しました'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * カテゴリ一覧取得
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await bookService.getCategories();

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
};
```

### 8.4 貸出Controller

**src/controllers/loanController.js**:
```javascript
const loanService = require('../services/loanService');

/**
 * 貸出一覧取得
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, user_id, status } = req.query;

    // 一般ユーザは自分の貸出のみ閲覧可能
    let userId = user_id;
    if (req.user.role !== 'admin') {
      userId = req.user.id;
    }

    const result = await loanService.getLoans({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      user_id: userId ? parseInt(userId) : null,
      status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 自分の貸出中書籍取得
 */
exports.myLoans = async (req, res, next) => {
  try {
    const result = await loanService.getMyLoans(req.user.id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 書籍を借りる
 */
exports.create = async (req, res, next) => {
  try {
    const { book_id } = req.body;
    const loan = await loanService.createLoan(req.user.id, book_id);

    res.status(201).json({
      success: true,
      data: { loan },
      message: `書籍を借りました。返却期限: ${loan.due_date.substring(0, 10)}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 書籍を返却する
 */
exports.return = async (req, res, next) => {
  try {
    const loanId = parseInt(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const loan = await loanService.returnLoan(loanId, req.user.id, isAdmin);

    const wasOverdue = loan.status === 'returned' && new Date(loan.due_date) < new Date(loan.return_date);

    res.json({
      success: true,
      data: {
        loan: {
          ...loan,
          was_overdue: wasOverdue
        }
      },
      message: '書籍を返却しました'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 延滞書籍一覧取得（管理者のみ）
 */
exports.overdue = async (req, res, next) => {
  try {
    const result = await loanService.getOverdueLoans();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
```

---

## 9. ルーティング設定

### 9.1 認証ルート

**src/routes/authRoutes.js**:
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validator');
const { loginLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');

router.post('/register', validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
```

### 9.2 ユーザルート

**src/routes/userRoutes.js**:
```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { validateIdParam, validatePagination } = require('../middleware/validator');

router.get('/', requireAuth, requireAdmin, validatePagination, userController.list);
router.get('/:id', requireAuth, requireOwnerOrAdmin, validateIdParam, userController.getById);
router.put('/:id', requireAuth, requireOwnerOrAdmin, validateIdParam, userController.update);
router.delete('/:id', requireAuth, requireAdmin, validateIdParam, userController.delete);

module.exports = router;
```

### 9.3 書籍ルート

**src/routes/bookRoutes.js**:
```javascript
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBookCreate, validateIdParam, validatePagination } = require('../middleware/validator');

router.get('/', requireAuth, validatePagination, bookController.list);
router.get('/categories', requireAuth, bookController.getCategories);
router.get('/:id', requireAuth, validateIdParam, bookController.getById);
router.post('/', requireAuth, requireAdmin, validateBookCreate, bookController.create);
router.put('/:id', requireAuth, requireAdmin, validateIdParam, bookController.update);
router.delete('/:id', requireAuth, requireAdmin, validateIdParam, bookController.delete);

module.exports = router;
```

### 9.4 貸出ルート

**src/routes/loanRoutes.js**:
```javascript
const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateLoanCreate, validateIdParam, validatePagination } = require('../middleware/validator');

router.get('/', requireAuth, validatePagination, loanController.list);
router.get('/my-loans', requireAuth, loanController.myLoans);
router.get('/overdue', requireAuth, requireAdmin, loanController.overdue);
router.post('/', requireAuth, validateLoanCreate, loanController.create);
router.put('/:id/return', requireAuth, validateIdParam, loanController.return);

module.exports = router;
```

### 9.5 ルートインデックス

**src/routes/index.js**:
```javascript
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const bookRoutes = require('./bookRoutes');
const loanRoutes = require('./loanRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/books', bookRoutes);
router.use('/loans', loanRoutes);

module.exports = router;
```

---

## 10. エラーハンドリング

既に **5.3 エラーハンドリングミドルウェア** で実装済み。

---

## 11. テスト実装

### 11.1 Jestセットアップ

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true
};
```

### 11.2 単体テスト例

**tests/unit/services/authService.test.js**:
```javascript
const authService = require('../../../src/services/authService');
const userRepository = require('../../../src/repositories/userRepository');
const { verifyPassword } = require('../../../src/utils/passwordHash');

jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/utils/passwordHash');

describe('authService.authenticate', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when credentials are valid', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      password_hash: 'hashed_password',
      role: 'user'
    };

    userRepository.findByUsername.mockResolvedValue(mockUser);
    verifyPassword.mockResolvedValue(true);

    const result = await authService.authenticate('testuser', 'password123');

    expect(result).toBeDefined();
    expect(result.username).toBe('testuser');
    expect(result.password_hash).toBeUndefined();
  });

  it('should return null when user not found', async () => {
    userRepository.findByUsername.mockResolvedValue(null);

    const result = await authService.authenticate('nonexistent', 'password');

    expect(result).toBeNull();
  });

  it('should return null when password is invalid', async () => {
    const mockUser = { id: 1, username: 'testuser', password_hash: 'hash' };
    userRepository.findByUsername.mockResolvedValue(mockUser);
    verifyPassword.mockResolvedValue(false);

    const result = await authService.authenticate('testuser', 'wrongpassword');

    expect(result).toBeNull();
  });
});
```

### 11.3 統合テスト例

**tests/integration/api/auth.test.js**:
```javascript
const request = require('supertest');
const app = require('../../../src/app');

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'newuser@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe('newuser');
    });

    it('should return error for duplicate username', async () => {
      // First registration
      await request(app).post('/api/auth/register').send({
        username: 'duplicate',
        password: 'password123',
        email: 'duplicate@example.com'
      });

      // Duplicate registration
      const response = await request(app).post('/api/auth/register').send({
        username: 'duplicate',
        password: 'password456',
        email: 'different@example.com'
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
```

**テスト実行**:
```bash
npm test              # 全テスト実行
npm run test:watch    # ウォッチモード
```

---

## 12. 起動・デプロイ

### 12.1 Expressアプリケーション設定

**src/app.js**:
```javascript
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const sessionConfig = require('./config/session');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();

// セキュリティヘッダー
app.use(helmet());

// CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// ボディパーサー
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session(sessionConfig));

// レート制限
app.use('/api', apiLimiter);

// ルーティング
app.use('/api', routes);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404エラーハンドリング
app.use(notFound);

// グローバルエラーハンドリング
app.use(errorHandler);

module.exports = app;
```

### 12.2 サーバー起動

**src/server.js**:
```javascript
const app = require('./app');
const logger = require('./utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
```

### 12.3 起動手順

```bash
# 1. 環境変数設定
cp .env.example .env
# .envのSESSION_SECRETを変更

# 2. データベース初期化
npm run db:init

# 3. 初期データ投入
npm run db:seed

# 4. 開発サーバー起動
npm run dev

# 本番環境起動
npm start
```

### 12.4 PM2設定（本番環境）

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'library-api',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**PM2コマンド**:
```bash
# PM2インストール
npm install -g pm2

# アプリ起動
pm2 start ecosystem.config.js

# ステータス確認
pm2 status

# ログ確認
pm2 logs library-api

# 再起動
pm2 restart library-api

# 停止
pm2 stop library-api

# 自動起動設定
pm2 startup
pm2 save
```

### 12.5 Nginx設定（リバースプロキシ）

**/etc/nginx/sites-available/library**:
```nginx
server {
    listen 80;
    server_name library.company.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**有効化**:
```bash
sudo ln -s /etc/nginx/sites-available/library /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## トラブルシューティング

### 問題: データベースロックエラー

**症状**:
```
Error: SQLITE_BUSY: database is locked
```

**解決策**:
1. WALモード有効化を確認
2. トランザクション時間を短縮
3. リトライロジック追加

```javascript
// リトライ機能付きクエリ実行
const retryQuery = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};
```

### 問題: セッションが保持されない

**症状**: ログイン後すぐにセッションが切れる

**解決策**:
1. CORS設定で `credentials: true` を確認
2. フロントエンドのAxiosで `withCredentials: true` を設定
3. Cookie の `sameSite` 設定を確認

### 問題: パスワードハッシュ化に時間がかかる

**症状**: ユーザ登録が遅い

**解決策**:
SALT_ROUNDS を調整（10 → 8）
```
BCRYPT_SALT_ROUNDS=8
```

### 問題: メモリ不足

**症状**: PM2でメモリエラー

**解決策**:
```javascript
// ecosystem.config.js
max_memory_restart: '500M' // メモリ上限引き上げ
```

---

## セキュリティチェックリスト

デプロイ前に以下を確認:

- [ ] `SESSION_SECRET` を強力なランダム文字列に変更
- [ ] `NODE_ENV=production` 設定
- [ ] Cookie の `secure: true` 設定（HTTPS環境）
- [ ] デフォルト管理者パスワード変更
- [ ] データベースファイルのパーミッション確認（600）
- [ ] ログファイルのローテーション設定
- [ ] レート制限の動作確認
- [ ] CORS設定の確認（許可するオリジン）
- [ ] エラーメッセージに機密情報が含まれないか確認
- [ ] SQLクエリがすべてPrepared Statementsか確認
- [ ] セキュリティヘッダーの設定確認

---

## パフォーマンス最適化チェックリスト

- [ ] SQLiteのPRAGMA設定確認（WALモード、キャッシュサイズ）
- [ ] インデックスの適用確認
- [ ] N+1クエリ問題の確認
- [ ] レスポンス圧縮有効化
- [ ] 静的ファイルのキャッシュ設定
- [ ] PM2クラスターモード活用

---

## まとめ

### 実装完了チェック

- [x] プロジェクトセットアップ
- [x] データベース層実装
- [x] 認証システム実装
- [x] ミドルウェア実装
- [x] Repository層実装
- [x] Service層実装
- [x] Controller層実装
- [x] ルーティング設定
- [x] エラーハンドリング
- [x] テスト実装
- [x] 起動・デプロイ設定

### 次のステップ

1. **フロントエンド統合**: Vue.jsクライアントとの接続確認
2. **E2Eテスト**: 実際のユーザフローをテスト
3. **監視設定**: プロダクション環境の監視体制構築
4. **バックアップ自動化**: 定期バックアップスクリプト実装
5. **ドキュメント更新**: 運用マニュアル作成

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Backend Architect Agent
**実装時間**: 約8-12時間（初回実装）
