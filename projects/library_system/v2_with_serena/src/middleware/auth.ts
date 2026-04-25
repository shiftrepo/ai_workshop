/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      user_id: string;
      is_admin: boolean;
    };
  }
}

/**
 * Verify session and attach user to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies.session_id;

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  try {
    // Check session validity
    const session = db
      .prepare(
        `
        SELECT s.user_id, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
      `
      )
      .get(sessionId) as { user_id: string; is_admin: number } | undefined;

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
      });
    }

    // Attach user to request
    req.user = {
      user_id: session.user_id,
      is_admin: session.is_admin === 1,
    };

    next();
  } catch (error) {
    /* istanbul ignore next */
    console.error('Authentication error:', error);
    /* istanbul ignore next */
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Verify admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.is_admin) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required',
    });
  }
  next();
}
