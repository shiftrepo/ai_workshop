const express = require('express');
const router = express.Router();
const LoanController = require('../controllers/loanController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// POST /api/borrow - 貸出
router.post('/borrow', requireAuth, LoanController.borrow);

// POST /api/return - 返却
router.post('/return', requireAuth, LoanController.return);

// GET /api/loans - 全貸出記録（管理者のみ）
router.get('/loans', requireAdmin, LoanController.getAllLoans);

// GET /api/loans/overdue - 期限切れ一覧（管理者のみ）
router.get('/loans/overdue', requireAdmin, LoanController.getOverdue);

module.exports = router;
