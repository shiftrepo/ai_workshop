const Book = require('../models/Book');

class BookController {
    // 書籍一覧取得
    static async getAll(req, res, next) {
        try {
            const books = await Book.getAll();
            res.json({
                success: true,
                books
            });
        } catch (err) {
            next(err);
        }
    }

    // 利用可能な書籍一覧取得
    static async getAvailable(req, res, next) {
        try {
            const books = await Book.getAvailable();
            res.json({
                success: true,
                books
            });
        } catch (err) {
            next(err);
        }
    }

    // 書籍詳細取得
    static async getById(req, res, next) {
        try {
            const { bookId } = req.params;
            const book = await Book.findByBookId(bookId);

            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: '書籍が見つかりません。'
                });
            }

            res.json({
                success: true,
                book
            });
        } catch (err) {
            next(err);
        }
    }

    // 書籍登録（管理者のみ）
    static async add(req, res, next) {
        try {
            const { bookId, title, author, isbn } = req.body;

            // バリデーション
            if (!bookId || !title || !author) {
                return res.status(400).json({
                    success: false,
                    message: '書籍ID、タイトル、著者は必須です。'
                });
            }

            // 既存チェック
            const existingBook = await Book.findByBookId(bookId);
            if (existingBook) {
                return res.status(400).json({
                    success: false,
                    message: 'この書籍IDは既に使用されています。'
                });
            }

            // 書籍作成
            await Book.create(bookId, title, author, isbn);

            res.status(201).json({
                success: true,
                message: '書籍を登録しました。'
            });
        } catch (err) {
            next(err);
        }
    }

    // 書籍削除（管理者のみ）
    static async delete(req, res, next) {
        try {
            const { bookId } = req.params;

            const book = await Book.findByBookId(bookId);
            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: '書籍が見つかりません。'
                });
            }

            // 貸出中の場合は削除不可
            if (book.status === 'borrowed') {
                return res.status(400).json({
                    success: false,
                    message: '貸出中の書籍は削除できません。'
                });
            }

            await Book.delete(bookId);

            res.json({
                success: true,
                message: '書籍を削除しました。'
            });
        } catch (err) {
            next(err);
        }
    }

    // 書籍検索
    static async search(req, res, next) {
        try {
            const { keyword } = req.query;

            if (!keyword) {
                return res.status(400).json({
                    success: false,
                    message: '検索キーワードを指定してください。'
                });
            }

            const books = await Book.searchByTitle(keyword);

            res.json({
                success: true,
                books
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = BookController;
