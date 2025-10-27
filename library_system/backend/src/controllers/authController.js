const User = require('../models/User');

class AuthController {
    // ユーザー登録
    static async register(req, res, next) {
        try {
            const { userId, password, name } = req.body;

            // バリデーション
            if (!userId || !password || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'ユーザーID、パスワード、名前は必須です。'
                });
            }

            if (userId.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'ユーザーIDは3文字以上である必要があります。'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'パスワードは6文字以上である必要があります。'
                });
            }

            // ユーザーが既に存在するかチェック
            const existingUser = await User.findByUserId(userId);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'このユーザーIDは既に使用されています。'
                });
            }

            // ユーザー作成
            await User.create(userId, password, name);

            res.status(201).json({
                success: true,
                message: 'ユーザー登録が完了しました。'
            });
        } catch (err) {
            next(err);
        }
    }

    // ログイン
    static async login(req, res, next) {
        try {
            const { userId, password } = req.body;

            // バリデーション
            if (!userId || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'ユーザーIDとパスワードは必須です。'
                });
            }

            // 認証
            const user = await User.verifyPassword(userId, password);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'ユーザーIDまたはパスワードが間違っています。'
                });
            }

            // セッションに保存
            req.session.userId = user.user_id;
            req.session.isAdmin = user.is_admin === 1;
            req.session.name = user.name;

            res.json({
                success: true,
                message: 'ログインしました。',
                user: {
                    userId: user.user_id,
                    name: user.name,
                    isAdmin: user.is_admin === 1
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // ログアウト
    static async logout(req, res, next) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    return next(err);
                }
                res.json({
                    success: true,
                    message: 'ログアウトしました。'
                });
            });
        } catch (err) {
            next(err);
        }
    }

    // 現在のユーザー情報取得
    static async getCurrentUser(req, res, next) {
        try {
            if (!req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'ログインしていません。'
                });
            }

            res.json({
                success: true,
                user: {
                    userId: req.session.userId,
                    name: req.session.name,
                    isAdmin: req.session.isAdmin
                }
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = AuthController;
