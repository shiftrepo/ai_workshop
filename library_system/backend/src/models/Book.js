const database = require('../config/database');

class Book {
    static async create(bookId, title, author, isbn = null) {
        const result = await database.run(
            'INSERT INTO books (book_id, title, author, isbn) VALUES (?, ?, ?, ?)',
            [bookId, title, author, isbn]
        );
        return result.id;
    }

    static async findByBookId(bookId) {
        return await database.get(
            'SELECT * FROM books WHERE book_id = ?',
            [bookId]
        );
    }

    static async findById(id) {
        return await database.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );
    }

    static async getAll() {
        return await database.all(
            'SELECT * FROM books ORDER BY created_at DESC'
        );
    }

    static async getAvailable() {
        return await database.all(
            'SELECT * FROM books WHERE status = ? ORDER BY title',
            ['available']
        );
    }

    static async updateStatus(bookId, status) {
        const result = await database.run(
            'UPDATE books SET status = ? WHERE book_id = ?',
            [status, bookId]
        );
        return result.changes > 0;
    }

    static async delete(bookId) {
        const result = await database.run(
            'DELETE FROM books WHERE book_id = ?',
            [bookId]
        );
        return result.changes > 0;
    }

    static async searchByTitle(keyword) {
        return await database.all(
            'SELECT * FROM books WHERE title LIKE ? ORDER BY title',
            [`%${keyword}%`]
        );
    }
}

module.exports = Book;
