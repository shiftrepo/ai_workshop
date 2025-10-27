const express = require('express');
const router = express.Router();
const BookController = require('../controllers/bookController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/books - 書籍一覧取得
router.get('/', requireAuth, BookController.getAll);

// GET /api/books/available - 利用可能な書籍一覧
router.get('/available', requireAuth, BookController.getAvailable);

// GET /api/books/search - 書籍検索
router.get('/search', requireAuth, BookController.search);

// GET /api/books/:bookId - 書籍詳細取得
router.get('/:bookId', requireAuth, BookController.getById);

// POST /api/book/add - 書籍登録（管理者のみ）
router.post('/add', requireAdmin, BookController.add);

// DELETE /api/books/:bookId - 書籍削除（管理者のみ）
router.delete('/:bookId', requireAdmin, BookController.delete);

module.exports = router;
