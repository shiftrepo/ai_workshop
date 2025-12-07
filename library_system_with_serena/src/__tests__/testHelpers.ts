/**
 * Test setup and helpers
 */

import { db } from '../database/connection';
import { resetDatabase, initializeDatabase, seedDemoData } from '../database/init';

/**
 * Setup test database before all tests
 * For in-memory databases, we start fresh each time
 */
export async function setupTestDatabase() {
  initializeDatabase();
  await seedDemoData();
}

/**
 * Clean up test database after all tests
 */
export function cleanupTestDatabase() {
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM loans');
  db.exec('DELETE FROM books');
  db.exec('DELETE FROM users');
}

/**
 * Reset test database between tests
 */
export async function resetTestDatabase() {
  cleanupTestDatabase();
  await seedDemoData();
}
