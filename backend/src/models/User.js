const db = require("../config/database");

class User {
    static async findById(id) {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [
            id,
        ]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        return result.rows[0];
    }

    static async findByUsername(username) {
        const result = await db.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );
        return result.rows[0];
    }

    static async create(username, email, passwordHash) {
        const result = await db.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
            [username, email, passwordHash]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const { username, email } = data;
        const result = await db.query(
            "UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email) WHERE id = $3 RETURNING id, username, email",
            [username, email, id]
        );
        return result.rows[0];
    }

    static async updateAvatar(id, filename) {
        const result = await db.query(
            "UPDATE users SET personal_picture = $1 WHERE id = $2 RETURNING personal_picture",
            [filename, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(
            "DELETE FROM users WHERE id = $1 RETURNING id",
            [id]
        );
        return result.rows[0];
    }

    static async getAllUsers() {
        const result = await db.query(
            "SELECT id, username, email, created_at FROM users ORDER BY created_at DESC"
        );
        return result.rows;
    }

    static async saveResetCode(email, code, expiresAt) {
        const result = await db.query(
            "UPDATE users SET reset_code = $1, reset_code_expires_at = $2 WHERE email = $3 RETURNING id",
            [code, expiresAt, email]
        );
        return result.rows[0];
    }

    static async findByResetCode(email, code) {
        const result = await db.query(
            "SELECT * FROM users WHERE email = $1 AND reset_code = $2 AND reset_code_expires_at > CURRENT_TIMESTAMP",
            [email, code]
        );
        return result.rows[0];
    }

    static async updatePassword(id, passwordHash) {
        const result = await db.query(
            "UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires_at = NULL WHERE id = $2 RETURNING id",
            [passwordHash, id]
        );
        return result.rows[0];
    }

    static async incrementWarningCount(id) {
        const result = await db.query(
            "UPDATE users SET warning_count = warning_count + 1 WHERE id = $1 RETURNING warning_count",
            [id]
        );
        return result.rows[0]?.warning_count || 0;
    }
}

module.exports = User;
