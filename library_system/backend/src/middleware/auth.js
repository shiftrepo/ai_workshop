// 認証ミドルウェア

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: '認証が必要です。ログインしてください。'
        });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: '認証が必要です。'
        });
    }
    if (!req.session.isAdmin) {
        return res.status(403).json({
            success: false,
            message: '管理者権限が必要です。'
        });
    }
    next();
}

module.exports = {
    requireAuth,
    requireAdmin
};
