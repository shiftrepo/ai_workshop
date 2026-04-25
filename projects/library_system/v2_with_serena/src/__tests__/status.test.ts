/**
 * Status check API tests
 */

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, resetTestDatabase, cleanupTestDatabase } from './testHelpers';

describe('Status Check API', () => {
  let adminCookies: any;
  let userCookies: any;
  let user002Cookies: any;

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

    // Login as user001
    const userLogin = await request(app)
      .post('/api/login')
      .send({ user_id: 'user001', password: 'pass001' });
    userCookies = userLogin.headers['set-cookie'];

    // Login as user002
    const user002Login = await request(app)
      .post('/api/login')
      .send({ user_id: 'user002', password: 'pass002' });
    user002Cookies = user002Login.headers['set-cookie'];
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe('GET /api/status/user/:user_id', () => {
    it('should get user status with no borrowed books', async () => {
      const response = await request(app)
        .get('/api/status/user/user001')
        .set('Cookie', userCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe('user001');
      expect(response.body.data.borrowed_books).toEqual([]);
    });

    it('should get user status with borrowed books', async () => {
      // Borrow some books
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0002' });

      const response = await request(app)
        .get('/api/status/user/user001')
        .set('Cookie', userCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.borrowed_books).toHaveLength(2);

      const book = response.body.data.borrowed_books[0];
      expect(book).toHaveProperty('book_id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('borrowed_at');
      expect(book).toHaveProperty('due_date');
      expect(book).toHaveProperty('is_overdue');
    });

    it('should reject status check without authentication', async () => {
      const response = await request(app).get('/api/status/user/user001');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject status check for another user', async () => {
      const response = await request(app)
        .get('/api/status/user/user002')
        .set('Cookie', userCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('another user');
    });

    it('should allow admin to check status for any user', async () => {
      const response = await request(app)
        .get('/api/status/user/user001')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/status/book/:book_id', () => {
    it('should get book status when available', async () => {
      const response = await request(app)
        .get('/api/status/book/BOOK0001')
        .set('Cookie', userCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.book_id).toBe('BOOK0001');
      expect(response.body.data.is_available).toBe(true);
      expect(response.body.data.borrowed_by).toBeUndefined();
    });

    it('should get book status when borrowed', async () => {
      // Borrow the book
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      const response = await request(app)
        .get('/api/status/book/BOOK0001')
        .set('Cookie', userCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.book_id).toBe('BOOK0001');
      expect(response.body.data.is_available).toBe(false);
      expect(response.body.data.borrowed_by).toBe('user001');
      expect(response.body.data.borrowed_at).toBeDefined();
      expect(response.body.data.due_date).toBeDefined();
    });

    it('should reject status check without authentication', async () => {
      const response = await request(app).get('/api/status/book/BOOK0001');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject status check for non-existent book', async () => {
      const response = await request(app)
        .get('/api/status/book/BOOK9999')
        .set('Cookie', userCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});
