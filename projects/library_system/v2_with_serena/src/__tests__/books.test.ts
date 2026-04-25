/**
 * Book management API tests
 */

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, resetTestDatabase, cleanupTestDatabase } from './testHelpers';

describe('Book Management API', () => {
  let adminCookies: any;
  let userCookies: any;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/login')
      .send({ user_id: 'admin', password: 'admin123' });
    adminCookies = adminLogin.headers['set-cookie'];

    // Login as regular user
    const userLogin = await request(app)
      .post('/api/login')
      .send({ user_id: 'user001', password: 'pass001' });
    userCookies = userLogin.headers['set-cookie'];
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe('GET /api/books', () => {
    it('should get all books without authentication', async () => {
      const response = await request(app).get('/api/books');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return books with proper structure', async () => {
      const response = await request(app).get('/api/books');

      expect(response.status).toBe(200);
      const book = response.body.data[0];
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('book_id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('created_at');
    });
  });

  describe('POST /api/book/add', () => {
    it('should add a book as admin', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ title: 'Test Book', author: 'Test Author' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Book');
      expect(response.body.data.book_ids).toHaveLength(1);
    });

    it('should add multiple copies of a book', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ title: 'Test Book', author: 'Test Author', copies: 3 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.book_ids).toHaveLength(3);
    });

    it('should reject add book without authentication', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .send({ title: 'Test Book', author: 'Test Author' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject add book as regular user', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', userCookies)
        .send({ title: 'Test Book', author: 'Test Author' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin');
    });

    it('should reject add book with missing title', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ author: 'Test Author' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject add book with missing author', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ title: 'Test Book' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject add book with invalid copies count (too low)', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ title: 'Test Book', author: 'Test Author', copies: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between 1 and 3');
    });

    it('should reject add book with invalid copies count (too high)', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ title: 'Test Book', author: 'Test Author', copies: 4 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between 1 and 3');
    });
  });

  describe('DELETE /api/book/:book_id', () => {
    it('should delete a book as admin', async () => {
      const response = await request(app)
        .delete('/api/book/BOOK0001')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.book_id).toBe('BOOK0001');
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app).delete('/api/book/BOOK0001');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject delete as regular user', async () => {
      const response = await request(app)
        .delete('/api/book/BOOK0001')
        .set('Cookie', userCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject delete non-existent book', async () => {
      const response = await request(app)
        .delete('/api/book/BOOK9999')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should reject delete borrowed book', async () => {
      // First, borrow a book
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      // Try to delete the borrowed book
      const response = await request(app)
        .delete('/api/book/BOOK0001')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('currently borrowed');
    });
  });
});
