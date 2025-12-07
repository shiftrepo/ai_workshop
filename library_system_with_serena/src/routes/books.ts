/**
 * Book management routes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { AddBookRequest, ApiResponse, Book } from '../types';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/books
 * Get all books
 */
router.get('/books', (req: Request, res: Response) => {
  try {
    const books = db.prepare('SELECT * FROM books ORDER BY title').all() as Book[];

    return res.status(200).json({
      success: true,
      data: books,
    });
  } catch (error) {
    /* istanbul ignore next */
    console.error('Get books error:', error);
    /* istanbul ignore next */
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve books',
    });
  }
});

/**
 * POST /api/book/add
 * Add new books (admin only)
 */
router.post(
  '/book/add',
  authenticate,
  requireAdmin,
  (req: Request<{}, ApiResponse, AddBookRequest>, res: Response) => {
    const { title, author, copies = 1 } = req.body;

    // Validation
    if (!title || !author) {
      return res.status(400).json({
        success: false,
        error: 'title and author are required',
      });
    }

    if (copies < 1 || copies > 3) {
      return res.status(400).json({
        success: false,
        error: 'copies must be between 1 and 3',
      });
    }

    try {
      // Get next book ID
      const lastBook = db
        .prepare("SELECT book_id FROM books WHERE book_id LIKE 'BOOK%' ORDER BY book_id DESC LIMIT 1")
        .get() as { book_id: string } | undefined;

      let nextId = 1;
      if (lastBook) {
        const lastIdNum = parseInt(lastBook.book_id.substring(4));
        nextId = lastIdNum + 1;
      }

      const addedBooks: string[] = [];

      // Insert books
      const insertStmt = db.prepare(
        'INSERT INTO books (book_id, title, author) VALUES (?, ?, ?)'
      );

      for (let i = 0; i < copies; i++) {
        const bookId = `BOOK${String(nextId + i).padStart(4, '0')}`;
        insertStmt.run(bookId, title, author);
        addedBooks.push(bookId);
      }

      return res.status(201).json({
        success: true,
        message: `${copies} book(s) added successfully`,
        data: {
          title,
          author,
          book_ids: addedBooks,
        },
      });
    } catch (error) {
      /* istanbul ignore next */
    console.error('Add book error:', error);
    /* istanbul ignore next */
      return res.status(500).json({
        success: false,
        error: 'Failed to add book',
      });
    }
  }
);

/**
 * DELETE /api/book/:book_id
 * Delete a book (admin only)
 */
router.delete(
  '/book/:book_id',
  authenticate,
  requireAdmin,
  (req: Request<{ book_id: string }>, res: Response) => {
    const { book_id } = req.params;

    try {
      // Check if book exists
      const book = db.prepare('SELECT * FROM books WHERE book_id = ?').get(book_id);

      if (!book) {
        return res.status(404).json({
          success: false,
          error: 'Book not found',
        });
      }

      // Check if book is currently borrowed
      const activeLoan = db
        .prepare('SELECT * FROM loans WHERE book_id = ? AND returned_at IS NULL')
        .get(book_id);

      if (activeLoan) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete book that is currently borrowed',
        });
      }

      // Delete book
      db.prepare('DELETE FROM books WHERE book_id = ?').run(book_id);

      return res.status(200).json({
        success: true,
        message: 'Book deleted successfully',
        data: { book_id },
      });
    } catch (error) {
      /* istanbul ignore next */
    console.error('Delete book error:', error);
    /* istanbul ignore next */
      return res.status(500).json({
        success: false,
        error: 'Failed to delete book',
      });
    }
  }
);

export default router;
