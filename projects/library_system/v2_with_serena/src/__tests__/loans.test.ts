/**
 * Loan and return API tests
 */

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, resetTestDatabase, cleanupTestDatabase } from './testHelpers';

describe('Loan and Return API', () => {
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

  describe('POST /api/borrow', () => {
    it('should borrow a book successfully', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe('user001');
      expect(response.body.data.book_id).toBe('BOOK0001');
      expect(response.body.data.due_date).toBeDefined();
    });

    it('should reject borrow without authentication', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject borrow with missing user_id', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ book_id: 'BOOK0001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject borrow with missing book_id', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject borrow for another user', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user002', book_id: 'BOOK0001' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('another user');
    });

    it('should allow admin to borrow for another user', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', adminCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject borrow non-existent book', async () => {
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK9999' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should reject borrow already borrowed book', async () => {
      // First borrow
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      // Try to borrow same book
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', user002Cookies)
        .send({ user_id: 'user002', book_id: 'BOOK0001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already borrowed');
    });

    it('should reject borrow when user has 3 books already', async () => {
      // Borrow 3 books
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0002' });
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0003' });

      // Try to borrow 4th book
      const response = await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0004' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('more than 3');
    });
  });

  describe('POST /api/return', () => {
    beforeEach(async () => {
      // Borrow a book for testing return
      await request(app)
        .post('/api/borrow')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });
    });

    it('should return a book successfully', async () => {
      const response = await request(app)
        .post('/api/return')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe('user001');
      expect(response.body.data.book_id).toBe('BOOK0001');
    });

    it('should reject return without authentication', async () => {
      const response = await request(app)
        .post('/api/return')
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject return with missing user_id', async () => {
      const response = await request(app)
        .post('/api/return')
        .set('Cookie', userCookies)
        .send({ book_id: 'BOOK0001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject return with missing book_id', async () => {
      const response = await request(app)
        .post('/api/return')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject return for another user', async () => {
      const response = await request(app)
        .post('/api/return')
        .set('Cookie', user002Cookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('another user');
    });

    it('should allow admin to return for another user', async () => {
      const response = await request(app)
        .post('/api/return')
        .set('Cookie', adminCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0001' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject return non-borrowed book', async () => {
      const response = await request(app)
        .post('/api/return')
        .set('Cookie', userCookies)
        .send({ user_id: 'user001', book_id: 'BOOK0002' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No active loan');
    });
  });
});
