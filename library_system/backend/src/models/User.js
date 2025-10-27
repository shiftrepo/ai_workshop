const bcrypt = require('bcrypt');
const database = require('../config/database');

class User {
    static async create(userId, password, name, isAdmin = 0) {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await database.run(
            'INSERT INTO users (user_id, password_hash, name, is_admin) VALUES (?, ?, ?, ?)',
            [userId, passwordHash, name, isAdmin]
        );
        return result.id;
    }

    static async findByUserId(userId) {
        return await database.get(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
        );
    }

    static async findById(id) {
        return await database.get(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
    }

    static async verifyPassword(userId, password) {
        const user = await this.findByUserId(userId);
        if (!user) {
            return null;
        }
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        }
        // パスワードハッシュを除外して返す
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    static async getAll() {
        const users = await database.all(
            'SELECT id, user_id, name, is_admin, created_at FROM users'
        );
        return users;
    }
}

module.exports = User;
