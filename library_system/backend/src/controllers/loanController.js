const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User');

class LoanController {
    // 貸出処理
    static async borrow(req, res, next) {
        try {
            const { bookId } = req.body;
            const userId = req.session.userId;

            // バリデーション
            if (!bookId) {
                return res.status(400).json({
                    success: false,
                    message: '書籍IDは必須です。'
                });
            }

            // 書籍の存在確認
            const book = await Book.findByBookId(bookId);
            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: '書籍が見つかりません。'
                });
            }

            // 書籍が利用可能か確認
            if (book.status !== 'available') {
                return res.status(400).json({
                    success: false,
                    message: 'この書籍は現在貸出中です。'
                });
            }

            // ユーザーの現在の貸出数確認（最大3冊）
            const currentLoans = await Loan.countActiveByUserId(userId);
            if (currentLoans >= 3) {
                return res.status(400).json({
                    success: false,
                    message: '貸出上限（3冊）に達しています。'
                });
            }

            // 貸出期限を2週間後に設定
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);

            // 貸出記録作成
            await Loan.create(userId, bookId, dueDate.toISOString());

            // 書籍のステータスを更新
            await Book.updateStatus(bookId, 'borrowed');

            res.status(201).json({
                success: true,
                message: '貸出処理が完了しました。',
                dueDate: dueDate.toISOString()
            });
        } catch (err) {
            next(err);
        }
    }

    // 返却処理
    static async return(req, res, next) {
        try {
            const { bookId } = req.body;
            const userId = req.session.userId;

            // バリデーション
            if (!bookId) {
                return res.status(400).json({
                    success: false,
                    message: '書籍IDは必須です。'
                });
            }

            // 貸出記録の存在確認
            const activeLoan = await Loan.getActiveByBookId(bookId);
            if (!activeLoan) {
                return res.status(404).json({
                    success: false,
                    message: 'この書籍の貸出記録が見つかりません。'
                });
            }

            // 本人確認（管理者は全ての返却を処理可能）
            if (activeLoan.user_id !== userId && !req.session.isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: '他のユーザーの貸出を返却することはできません。'
                });
            }

            // 返却処理
            await Loan.returnBook(activeLoan.user_id, bookId);

            // 書籍のステータスを更新
            await Book.updateStatus(bookId, 'available');

            res.json({
                success: true,
                message: '返却処理が完了しました。'
            });
        } catch (err) {
            next(err);
        }
    }

    // 全貸出記録取得（管理者のみ）
    static async getAllLoans(req, res, next) {
        try {
            const loans = await Loan.getAll();
            res.json({
                success: true,
                loans
            });
        } catch (err) {
            next(err);
        }
    }

    // 期限切れ一覧取得（管理者のみ）
    static async getOverdue(req, res, next) {
        try {
            const overdueLoans = await Loan.getOverdue();
            res.json({
                success: true,
                overdueLoans
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = LoanController;
