const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// POST /api/register - ユーザー登録
router.post('/register', AuthController.register);

// POST /api/login - ログイン
router.post('/login', AuthController.login);

// POST /api/logout - ログアウト
router.post('/logout', AuthController.logout);

// GET /api/me - 現在のユーザー情報取得
router.get('/me', AuthController.getCurrentUser);

module.exports = router;
