const express = require('express');
const router = express.Router();
const StatusController = require('../controllers/statusController');
const { requireAuth } = require('../middleware/auth');

// GET /api/status/my - 自分の貸出状況
router.get('/my', requireAuth, StatusController.getMyStatus);

// GET /api/status/user/:userId - ユーザーの貸出状況
router.get('/user/:userId', requireAuth, StatusController.getUserStatus);

// GET /api/status/book/:bookId - 書籍の貸出状況
router.get('/book/:bookId', requireAuth, StatusController.getBookStatus);

module.exports = router;
