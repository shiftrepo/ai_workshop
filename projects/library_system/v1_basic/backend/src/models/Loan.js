const database = require('../config/database');

class Loan {
    static async create(userId, bookId, dueDate) {
        const result = await database.run(
            'INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, ?)',
            [userId, bookId, dueDate]
        );
        return result.id;
    }

    static async getActiveByUserId(userId) {
        return await database.all(
            `SELECT l.*, b.title, b.author
             FROM loans l
             JOIN books b ON l.book_id = b.book_id
             WHERE l.user_id = ? AND l.status = 'active'
             ORDER BY l.borrowed_at DESC`,
            [userId]
        );
    }

    static async getActiveByBookId(bookId) {
        return await database.get(
            `SELECT l.*, u.name as user_name
             FROM loans l
             JOIN users u ON l.user_id = u.user_id
             WHERE l.book_id = ? AND l.status = 'active'`,
            [bookId]
        );
    }

    static async countActiveByUserId(userId) {
        const result = await database.get(
            'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status = ?',
            [userId, 'active']
        );
        return result.count;
    }

    static async returnBook(userId, bookId) {
        const result = await database.run(
            `UPDATE loans
             SET status = 'returned', returned_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND book_id = ? AND status = 'active'`,
            [userId, bookId]
        );
        return result.changes > 0;
    }

    static async getAll() {
        return await database.all(
            `SELECT l.*, u.name as user_name, b.title, b.author
             FROM loans l
             JOIN users u ON l.user_id = u.user_id
             JOIN books b ON l.book_id = b.book_id
             ORDER BY l.borrowed_at DESC`
        );
    }

    static async getOverdue() {
        return await database.all(
            `SELECT l.*, u.name as user_name, b.title, b.author
             FROM loans l
             JOIN users u ON l.user_id = u.user_id
             JOIN books b ON l.book_id = b.book_id
             WHERE l.status = 'active' AND l.due_date < CURRENT_TIMESTAMP
             ORDER BY l.due_date ASC`
        );
    }
}

module.exports = Loan;
