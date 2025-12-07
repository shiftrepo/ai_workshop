/**
 * Authentication routes
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../database/connection';
import { RegisterRequest, LoginRequest, ApiResponse } from '../types';
import { randomBytes } from 'crypto';

const router = Router();

/**
 * POST /api/register
 * Register a new user
 */
router.post('/register', async (req: Request<{}, ApiResponse, RegisterRequest>, res: Response) => {
  const { user_id, password } = req.body;

  // Validation
  if (!user_id || !password) {
    return res.status(400).json({
      success: false,
      error: 'user_id and password are required',
    });
  }

  if (user_id.length < 3 || user_id.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'user_id must be between 3 and 20 characters',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'password must be at least 6 characters',
    });
  }

  try {
    // Check if user already exists
    const existingUser = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(user_id);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    db.prepare('INSERT INTO users (user_id, password_hash) VALUES (?, ?)').run(
      user_id,
      passwordHash
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user_id },
    });
  } catch (error) {
    /* istanbul ignore next */
    console.error('Registration error:', error);
    /* istanbul ignore next */
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/login
 * Login user and create session
 */
router.post('/login', async (req: Request<{}, ApiResponse, LoginRequest>, res: Response) => {
  const { user_id, password } = req.body;

  // Validation
  if (!user_id || !password) {
    return res.status(400).json({
      success: false,
      error: 'user_id and password are required',
    });
  }

  try {
    // Get user
    const user = db
      .prepare('SELECT user_id, password_hash, is_admin FROM users WHERE user_id = ?')
      .get(user_id) as { user_id: string; password_hash: string; is_admin: number } | undefined;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Create session
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    db.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime(?))'
    ).run(sessionId, user_id, expiresAt.toISOString());

    // Set cookie
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user_id: user.user_id,
        is_admin: user.is_admin === 1,
      },
    });
  } catch (error) {
    /* istanbul ignore next */
    console.error('Login error:', error);
    /* istanbul ignore next */
    return res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /api/logout
 * Logout user and destroy session
 */
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies.session_id;

  if (sessionId) {
    try {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    } catch (error) {
      /* istanbul ignore next */
      console.error('Logout error:', error);
    }
  }

  res.clearCookie('session_id');

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

export default router;
