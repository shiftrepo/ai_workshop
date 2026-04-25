// エラーハンドリングミドルウェア

function errorHandler(err, req, res, next) {
    console.error('エラー:', err);

    // SQLiteエラーの処理
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({
            success: false,
            message: 'データの制約違反が発生しました。',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // デフォルトエラー
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'サーバーエラーが発生しました。',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}

module.exports = errorHandler;
