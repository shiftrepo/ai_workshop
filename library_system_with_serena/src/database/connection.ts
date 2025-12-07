/**
 * Database connection management
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use in-memory database for tests, file-based for production
const isTest = process.env.NODE_ENV === 'test';
const DB_PATH = isTest ? ':memory:' : path.join(process.cwd(), 'data', 'library.db');

// Ensure data directory exists (only for non-test environment)
if (!isTest) {
  const DB_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Create database connection
export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Close database on process exit
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
