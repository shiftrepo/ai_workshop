/**
 * Database initialization tests
 */

import { db } from '../database/connection';
import { resetDatabase, initializeDatabase, seedDemoData } from '../database/init';

describe('Database Module', () => {
  describe('resetDatabase', () => {
    it('should drop all tables successfully', () => {
      // First initialize to ensure tables exist
      initializeDatabase();

      // Then reset
      expect(() => resetDatabase()).not.toThrow();

      // Verify main tables are dropped (sqlite_sequence may remain)
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];

      expect(tables.length).toBe(0);
    });
  });

  describe('seedDemoData', () => {
    beforeEach(() => {
      resetDatabase();
      initializeDatabase();
    });

    it('should skip seeding if data already exists', async () => {
      // First seed
      await seedDemoData();

      // Second seed should skip
      await seedDemoData();

      // Verify only one set of users exists
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      expect(userCount.count).toBe(4); // admin + 3 test users
    });
  });

  describe('initializeDatabase', () => {
    beforeEach(() => {
      resetDatabase();
    });

    it('should create all required tables', () => {
      initializeDatabase();

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { name: string }[];

      expect(tables.length).toBe(4);
      expect(tables.map((t) => t.name)).toEqual(['books', 'loans', 'sessions', 'users']);
    });

    it('should not fail if called multiple times (idempotent)', () => {
      initializeDatabase();
      expect(() => initializeDatabase()).not.toThrow();
    });
  });

  describe('Database Schema', () => {
    beforeEach(() => {
      resetDatabase();
      initializeDatabase();
    });

    it('should enforce foreign key constraints', () => {
      // Try to insert a loan with non-existent user
      expect(() => {
        db.prepare('INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, datetime("now"))').run(
          'nonexistent',
          'BOOK0001'
        );
      }).toThrow();
    });

    it('should have unique constraint on users.user_id', () => {
      // Insert a user
      db.prepare('INSERT INTO users (user_id, password_hash, is_admin) VALUES (?, ?, 0)').run(
        'testuser',
        'hash'
      );

      // Try to insert duplicate
      expect(() => {
        db.prepare('INSERT INTO users (user_id, password_hash, is_admin) VALUES (?, ?, 0)').run(
          'testuser',
          'hash2'
        );
      }).toThrow(/UNIQUE constraint failed/);
    });

    it('should have unique constraint on books.book_id', () => {
      // Insert a book
      db.prepare('INSERT INTO books (book_id, title, author) VALUES (?, ?, ?)').run(
        'BOOK0001',
        'Test',
        'Author'
      );

      // Try to insert duplicate
      expect(() => {
        db.prepare('INSERT INTO books (book_id, title, author) VALUES (?, ?, ?)').run(
          'BOOK0001',
          'Test2',
          'Author2'
        );
      }).toThrow(/UNIQUE constraint failed/);
    });
  });
});
