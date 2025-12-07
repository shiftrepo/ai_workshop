/**
 * Loan and return routes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { BorrowRequest, ReturnRequest, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/borrow
 * Borrow a book
 */
router.post(
  '/borrow',
  authenticate,
  (req: Request<{}, ApiResponse, BorrowRequest>, res: Response) => {
    const { user_id, book_id } = req.body;

    // Validation
    if (!user_id || !book_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id and book_id are required',
      });
    }

    // Check if authenticated user matches request user_id
    if (req.user?.user_id !== user_id && !req.user?.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Cannot borrow books for another user',
      });
    }

    try {
      // Check if book exists
      const book = db.prepare('SELECT * FROM books WHERE book_id = ?').get(book_id);

      if (!book) {
        return res.status(404).json({
          success: false,
          error: 'Book not found',
        });
      }

      // Check if book is already borrowed
      const activeLoan = db
        .prepare('SELECT * FROM loans WHERE book_id = ? AND returned_at IS NULL')
        .get(book_id);

      if (activeLoan) {
        return res.status(400).json({
          success: false,
          error: 'Book is already borrowed',
        });
      }

      // Check user's current loan count
      const userLoanCount = db
        .prepare(
          'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND returned_at IS NULL'
        )
        .get(user_id) as { count: number };

      if (userLoanCount.count >= 3) {
        return res.status(400).json({
          success: false,
          error: 'Cannot borrow more than 3 books at a time',
        });
      }

      // Calculate due date (2 weeks from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      // Create loan
      db.prepare(
        'INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, datetime(?))'
      ).run(user_id, book_id, dueDate.toISOString());

      return res.status(201).json({
        success: true,
        message: 'Book borrowed successfully',
        data: {
          user_id,
          book_id,
          due_date: dueDate.toISOString(),
        },
      });
    } catch (error) {
      /* istanbul ignore next */
    console.error('Borrow error:', error);
    /* istanbul ignore next */
      return res.status(500).json({
        success: false,
        error: 'Failed to borrow book',
      });
    }
  }
);

/**
 * POST /api/return
 * Return a book
 */
router.post(
  '/return',
  authenticate,
  (req: Request<{}, ApiResponse, ReturnRequest>, res: Response) => {
    const { user_id, book_id } = req.body;

    // Validation
    if (!user_id || !book_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id and book_id are required',
      });
    }

    // Check if authenticated user matches request user_id
    if (req.user?.user_id !== user_id && !req.user?.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Cannot return books for another user',
      });
    }

    try {
      // Find active loan
      const loan = db
        .prepare(
          'SELECT * FROM loans WHERE user_id = ? AND book_id = ? AND returned_at IS NULL'
        )
        .get(user_id, book_id);

      if (!loan) {
        return res.status(404).json({
          success: false,
          error: 'No active loan found for this user and book',
        });
      }

      // Update loan with return date
      db.prepare(
        "UPDATE loans SET returned_at = datetime('now') WHERE user_id = ? AND book_id = ? AND returned_at IS NULL"
      ).run(user_id, book_id);

      return res.status(200).json({
        success: true,
        message: 'Book returned successfully',
        data: {
          user_id,
          book_id,
        },
      });
    } catch (error) {
      /* istanbul ignore next */
    console.error('Return error:', error);
    /* istanbul ignore next */
      return res.status(500).json({
        success: false,
        error: 'Failed to return book',
      });
    }
  }
);

export default router;
