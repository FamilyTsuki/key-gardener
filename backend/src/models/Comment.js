const db = require("../config/database");

class Comment {
    /**
     * Creates a new comment in the database.
     * @param {any} postId - The postId.
     * @param {any} userId - The userId.
     * @param {any} content - The content.
     * @returns {Object} The created comment object.
     */
    static async create(postId, userId, content) {
        const result = await db.query(
            `INSERT INTO comments (post_id, user_id, content) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [postId, userId, content]
        );
        return result.rows[0];
    }

    /**
     * Retrieves all comments for a specific post.
     * @param {any} postId - The postId.
     * @returns {Array} Array of comment objects.
     */
    static async getByPostId(postId) {
        const result = await db.query(
            `SELECT c.*, u.username, u.personal_picture 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.post_id = $1 
             ORDER BY c.created_at ASC`,
            [postId]
        );
        return result.rows;
    }

    /**
     * Deletes a comment by its ID and ensures the user owns it.
     * @param {any} id - The id.
     * @param {any} userId - The userId.
     * @returns {Object} The deleted comment (or undefined if not found/unauthorized).
     */
    static async delete(id, userId) {
        const result = await db.query(
            `DELETE FROM comments 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [id, userId]
        );
        return result.rows[0];
    }

    static async getLastCommentTimestamp(userId) {
        const result = await db.query(
            "SELECT created_at FROM comments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
            [userId]
        );
        return result.rows[0]?.created_at || null;
    }
}

module.exports = Comment;
