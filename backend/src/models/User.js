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

    static async updateSettings(id, settings) {
        const result = await db.query(
            "UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings",
            [settings, id]
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

    /**
     * Finds a user by their Google OAuth ID.
     * @param {string} googleId - The unique Google OAuth ID.
     * @returns {Promise<Object|null>} The user object or null.
     */
    static async findByGoogleId(googleId) {
        const result = await db.query("SELECT * FROM users WHERE google_id = $1", [
            googleId,
        ]);
        return result.rows[0];
    }

    /**
     * Creates a new user authenticated via Google OAuth.
     * @param {string} username - The generated unique username.
     * @param {string} email - The email address.
     * @param {string} googleId - The Google user ID.
     * @param {string} pictureUrl - The avatar URL from Google.
     * @returns {Promise<Object>} The created user.
     */
    static async createGoogleUser(username, email, googleId, pictureUrl) {
        const result = await db.query(
            "INSERT INTO users (username, email, google_id, personal_picture) VALUES ($1, $2, $3, $4) RETURNING id, username, email, created_at",
            [username, email, googleId, pictureUrl]
        );
        return result.rows[0];
    }

    /**
     * Links a Google OAuth account to an existing user by email.
     * @param {number} id - The database user ID.
     * @param {string} googleId - The Google user ID.
     * @param {string} pictureUrl - The Google avatar picture URL.
     * @returns {Promise<Object>} The updated user.
     */
    static async linkGoogleAccount(id, googleId, pictureUrl) {
        const result = await db.query(
            "UPDATE users SET google_id = $1, personal_picture = COALESCE($2, personal_picture) WHERE id = $3 RETURNING id, username, email",
            [googleId, pictureUrl, id]
        );
        return result.rows[0];
    }
}

module.exports = User;
