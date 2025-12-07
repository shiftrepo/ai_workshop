/**
 * Middleware tests
 */

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } from './testHelpers';
import { db } from '../database/connection';

describe('Middleware', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe('Authentication Middleware', () => {
    it('should reject request with invalid session cookie', async () => {
      const response = await request(app)
        .get('/api/status/user/user001')
        .set('Cookie', ['connect.sid=s%3Ainvalid-session-id.fake-signature']);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject request with expired session', async () => {
      // Login to get a valid session
      const loginResponse = await request(app)
        .post('/api/login')
        .send({ user_id: 'user001', password: 'pass001' });

      const cookies: any = loginResponse.headers['set-cookie'];

      // Manually expire all sessions
      db.prepare('DELETE FROM sessions').run();

      // Try to access protected route with expired session
      const response = await request(app)
        .get('/api/status/user/user001')
        .set('Cookie', cookies);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin Middleware', () => {
    let userCookies: any;
    let adminCookies: any;

    beforeEach(async () => {
      // Login as regular user
      const userLogin = await request(app)
        .post('/api/login')
        .send({ user_id: 'user001', password: 'pass001' });
      userCookies = userLogin.headers['set-cookie'];

      // Login as admin
      const adminLogin = await request(app)
        .post('/api/login')
        .send({ user_id: 'admin', password: 'admin123' });
      adminCookies = adminLogin.headers['set-cookie'];
    });

    it('should reject non-admin access to admin routes', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', userCookies)
        .send({ title: 'Test Book', author: 'Test Author' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin');
    });

    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .post('/api/book/add')
        .set('Cookie', adminCookies)
        .send({ title: 'Test Book', author: 'Test Author' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
