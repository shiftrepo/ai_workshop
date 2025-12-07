/**
 * Database initialization script
 */

import { db } from './connection';
import {
  createUsersTable,
  createBooksTable,
  createLoansTable,
  createSessionsTable,
  createIndexes,
} from './schema';
import bcrypt from 'bcrypt';

/**
 * Initialize database tables
 */
export function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Create tables
    db.exec(createUsersTable);
    db.exec(createBooksTable);
    db.exec(createLoansTable);
    db.exec(createSessionsTable);

    // Create indexes
    createIndexes.forEach((indexSql) => db.exec(indexSql));

    console.log('Database initialized successfully');
  } catch (error) {
    /* istanbul ignore next */
    console.error('Failed to initialize database:', error);
    /* istanbul ignore next */
    throw error;
  }
}

/**
 * Seed database with demo data
 */
export async function seedDemoData() {
  try {
    console.log('Seeding demo data...');

    // Check if data already exists
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count > 0) {
      console.log('Demo data already exists. Skipping seed.');
      return;
    }

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO users (user_id, password_hash, is_admin) VALUES (?, ?, 1)').run(
      'admin',
      adminPasswordHash
    );

    // Create test users
    const testUsers = [
      { user_id: 'user001', password: 'pass001' },
      { user_id: 'user002', password: 'pass002' },
      { user_id: 'user003', password: 'pass003' },
    ];

    for (const user of testUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      db.prepare('INSERT INTO users (user_id, password_hash, is_admin) VALUES (?, ?, 0)').run(
        user.user_id,
        passwordHash
      );
    }

    // Create demo books (10 books, some with multiple copies)
    const books = [
      { title: 'TypeScript入門', author: '山田太郎', copies: 2 },
      { title: 'Node.js実践ガイド', author: '佐藤花子', copies: 3 },
      { title: 'データベース設計', author: '鈴木一郎', copies: 1 },
      { title: 'Webアプリ開発', author: '田中美咲', copies: 2 },
      { title: 'セキュリティ入門', author: '高橋健太', copies: 1 },
      { title: 'アルゴリズム', author: '伊藤直子', copies: 2 },
      { title: 'Vue.js入門', author: '渡辺次郎', copies: 1 },
      { title: 'REST API設計', author: '中村愛', copies: 1 },
      { title: 'テスト駆動開発', author: '小林大輔', copies: 2 },
      { title: 'リファクタリング', author: '加藤明美', copies: 1 },
    ];

    let bookIdCounter = 1;
    for (const book of books) {
      for (let i = 0; i < book.copies; i++) {
        const bookId = `BOOK${String(bookIdCounter).padStart(4, '0')}`;
        db.prepare('INSERT INTO books (book_id, title, author) VALUES (?, ?, ?)').run(
          bookId,
          book.title,
          book.author
        );
        bookIdCounter++;
      }
    }

    console.log('Demo data seeded successfully');
    console.log('Admin user: admin / admin123');
    console.log('Test users: user001/pass001, user002/pass002, user003/pass003');
  } catch (error) {
    /* istanbul ignore next */
    console.error('Failed to seed demo data:', error);
    /* istanbul ignore next */
    throw error;
  }
}

/**
 * Reset database (drop all data)
 */
export function resetDatabase() {
  try {
    console.log('Resetting database...');
    db.exec('DROP TABLE IF EXISTS sessions');
    db.exec('DROP TABLE IF EXISTS loans');
    db.exec('DROP TABLE IF EXISTS books');
    db.exec('DROP TABLE IF EXISTS users');
    console.log('Database reset successfully');
  } catch (error) {
    /* istanbul ignore next */
    console.error('Failed to reset database:', error);
    /* istanbul ignore next */
    throw error;
  }
}

// If run directly, initialize and seed database
/* istanbul ignore next */
if (require.main === module) {
  (async () => {
    try {
      resetDatabase();
      initializeDatabase();
      await seedDemoData();
      console.log('Database setup complete!');
      process.exit(0);
    } catch (error) {
      console.error('Database setup failed:', error);
      process.exit(1);
    }
  })();
}
