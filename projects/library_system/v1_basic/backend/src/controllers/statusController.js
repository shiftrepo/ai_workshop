const Loan = require('../models/Loan');
const Book = require('../models/Book');

class StatusController {
    // ユーザーの貸出状況確認
    static async getUserStatus(req, res, next) {
        try {
            const { userId } = req.params;

            // 自分の情報または管理者のみアクセス可能
            if (req.session.userId !== userId && !req.session.isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: '他のユーザーの情報にはアクセスできません。'
                });
            }

            const loans = await Loan.getActiveByUserId(userId);

            // 期限切れチェック
            const now = new Date();
            const loansWithOverdue = loans.map(loan => {
                const dueDate = new Date(loan.due_date);
                const isOverdue = dueDate < now;
                return {
                    ...loan,
                    isOverdue,
                    daysUntilDue: Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
                };
            });

            res.json({
                success: true,
                userId,
                activeLoans: loansWithOverdue.length,
                maxLoans: 3,
                remainingSlots: 3 - loansWithOverdue.length,
                loans: loansWithOverdue
            });
        } catch (err) {
            next(err);
        }
    }

    // 書籍の貸出状況確認
    static async getBookStatus(req, res, next) {
        try {
            const { bookId } = req.params;

            // 書籍の存在確認
            const book = await Book.findByBookId(bookId);
            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: '書籍が見つかりません。'
                });
            }

            // 貸出中の場合、貸出情報を取得
            let loanInfo = null;
            if (book.status === 'borrowed') {
                const activeLoan = await Loan.getActiveByBookId(bookId);
                if (activeLoan) {
                    const dueDate = new Date(activeLoan.due_date);
                    const now = new Date();
                    const isOverdue = dueDate < now;

                    loanInfo = {
                        borrowedBy: activeLoan.user_name,
                        borrowedAt: activeLoan.borrowed_at,
                        dueDate: activeLoan.due_date,
                        isOverdue,
                        daysUntilDue: Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
                    };
                }
            }

            res.json({
                success: true,
                book: {
                    bookId: book.book_id,
                    title: book.title,
                    author: book.author,
                    isbn: book.isbn,
                    status: book.status
                },
                loanInfo
            });
        } catch (err) {
            next(err);
        }
    }

    // 自分の貸出状況確認（ショートカット）
    static async getMyStatus(req, res, next) {
        try {
            req.params.userId = req.session.userId;
            return StatusController.getUserStatus(req, res, next);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = StatusController;
