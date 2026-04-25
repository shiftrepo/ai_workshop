/**
 * Authentication API tests
 */

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, resetTestDatabase, cleanupTestDatabase } from './testHelpers';

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ user_id: 'testuser', password: 'testpass123' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe('testuser');
    });

    it('should reject registration with missing user_id', async () => {
      const response = await request(app).post('/api/register').send({ password: 'testpass123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app).post('/api/register').send({ user_id: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with short user_id', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ user_id: 'ab', password: 'testpass123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between 3 and 20');
    });

    it('should reject registration with long user_id', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ user_id: 'a'.repeat(21), password: 'testpass123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('between 3 and 20');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ user_id: 'testuser', password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 6');
    });

    it('should reject duplicate user_id', async () => {
      await request(app)
        .post('/api/register')
        .send({ user_id: 'testuser', password: 'testpass123' });

      const response = await request(app)
        .post('/api/register')
        .send({ user_id: 'testuser', password: 'testpass456' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ user_id: 'user001', password: 'pass001' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe('user001');
      expect(response.body.data.is_admin).toBe(false);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should login admin successfully', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ user_id: 'admin', password: 'admin123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe('admin');
      expect(response.body.data.is_admin).toBe(true);
    });

    it('should reject login with missing user_id', async () => {
      const response = await request(app).post('/api/login').send({ password: 'pass001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app).post('/api/login').send({ user_id: 'user001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ user_id: 'nonexistent', password: 'password' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ user_id: 'user001', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('POST /api/logout', () => {
    it('should logout successfully', async () => {
      const loginResponse = await request(app)
        .post('/api/login')
        .send({ user_id: 'user001', password: 'pass001' });

      const cookies: any = loginResponse.headers['set-cookie'];

      const response = await request(app).post('/api/logout').set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should logout even without session', async () => {
      const response = await request(app).post('/api/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
