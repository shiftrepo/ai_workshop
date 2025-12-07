/**
 * Database schema definitions
 */

export const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

export const createBooksTable = `
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

export const createLoansTable = `
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    borrowed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    due_date TEXT NOT NULL,
    returned_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
  )
`;

export const createSessionsTable = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )
`;

export const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_books_book_id ON books(book_id)',
  'CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_loans_book_id ON loans(book_id)',
  'CREATE INDEX IF NOT EXISTS idx_loans_returned_at ON loans(returned_at)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',
];
