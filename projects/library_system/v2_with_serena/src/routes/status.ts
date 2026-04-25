/**
 * Status check routes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { UserStatus, BookStatus, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/status/user/:user_id
 * Get user's borrowed books status
 */
router.get(
  '/status/user/:user_id',
  authenticate,
  (req: Request<{ user_id: string }>, res: Response) => {
    const { user_id } = req.params;

    // Check if authenticated user matches request user_id or is admin
    if (req.user?.user_id !== user_id && !req.user?.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Cannot view status for another user',
      });
    }

    try {
      // Get user's active loans with book details
      const loans = db
        .prepare(
          `
          SELECT
            l.book_id,
            b.title,
            b.author,
            l.borrowed_at,
            l.due_date,
            CASE
              WHEN datetime(l.due_date) < datetime('now') THEN 1
              ELSE 0
            END as is_overdue
          FROM loans l
          JOIN books b ON l.book_id = b.book_id
          WHERE l.user_id = ? AND l.returned_at IS NULL
          ORDER BY l.due_date
        `
        )
        .all(user_id) as Array<{
        book_id: string;
        title: string;
        author: string;
        borrowed_at: string;
        due_date: string;
        is_overdue: number;
      }>;

      const userStatus: UserStatus = {
        user_id,
        borrowed_books: loans.map((loan) => ({
          book_id: loan.book_id,
          title: loan.title,
          author: loan.author,
          borrowed_at: loan.borrowed_at,
          due_date: loan.due_date,
          is_overdue: loan.is_overdue === 1,
        })),
      };

      return res.status(200).json({
        success: true,
        data: userStatus,
      });
    } catch (error) {
      /* istanbul ignore next */
    console.error('Get user status error:', error);
    /* istanbul ignore next */
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user status',
      });
    }
  }
);

/**
 * GET /api/status/book/:book_id
 * Get book's borrowing status
 */
router.get(
  '/status/book/:book_id',
  authenticate,
  (req: Request<{ book_id: string }>, res: Response) => {
    const { book_id } = req.params;

    try {
      // Get book details
      const book = db
        .prepare('SELECT book_id, title, author FROM books WHERE book_id = ?')
        .get(book_id) as { book_id: string; title: string; author: string } | undefined;

      if (!book) {
        return res.status(404).json({
          success: false,
          error: 'Book not found',
        });
      }

      // Check if book is currently borrowed
      const activeLoan = db
        .prepare(
          `
          SELECT user_id, borrowed_at, due_date
          FROM loans
          WHERE book_id = ? AND returned_at IS NULL
        `
        )
        .get(book_id) as
        | { user_id: string; borrowed_at: string; due_date: string }
        | undefined;

      const bookStatus: BookStatus = {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        is_available: !activeLoan,
        ...(activeLoan && {
          borrowed_by: activeLoan.user_id,
          borrowed_at: activeLoan.borrowed_at,
          due_date: activeLoan.due_date,
        }),
      };

      return res.status(200).json({
        success: true,
        data: bookStatus,
      });
    } catch (error) {
      /* istanbul ignore next */
    console.error('Get book status error:', error);
    /* istanbul ignore next */
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve book status',
      });
    }
  }
);

export default router;
