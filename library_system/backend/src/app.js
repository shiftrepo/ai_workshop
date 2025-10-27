const express = require('express');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const database = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// ルート
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const loanRoutes = require('./routes/loans');
const statusRoutes = require('./routes/status');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session({
    secret: process.env.SESSION_SECRET || 'library-system-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24時間
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// ルート設定
app.use('/api', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/book', bookRoutes); // /api/book/add 用
app.use('/api', loanRoutes);
app.use('/api/status', statusRoutes);

// ヘルスチェック
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Library System API is running',
        timestamp: new Date().toISOString()
    });
});

// エラーハンドリング
app.use(errorHandler);

// 404ハンドリング
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'エンドポイントが見つかりません。'
    });
});

// サーバー起動
async function startServer() {
    try {
        // データベース接続
        await database.connect();
        console.log('✓ データベースに接続しました');

        // サーバー起動
        app.listen(PORT, () => {
            console.log(`✓ サーバーが起動しました: http://localhost:${PORT}`);
            console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (err) {
        console.error('サーバー起動エラー:', err);
        process.exit(1);
    }
}

// グレースフルシャットダウン
process.on('SIGINT', async () => {
    console.log('\nサーバーをシャットダウンしています...');
    await database.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nサーバーをシャットダウンしています...');
    await database.close();
    process.exit(0);
});

// サーバー起動
startServer();

module.exports = app;
