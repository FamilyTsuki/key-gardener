const db = require("../config/database");

class Votes {
    static async findByPostAndUser(postId, userId) {
        const result = await db.query(
            "SELECT * FROM votes WHERE post_id = $1 AND user_id = $2",
            [postId, userId]
        );
        return result.rows[0];
    }

    static async create(postId, userId, voteType) {
        const result = await db.query(
            "INSERT INTO votes (post_id, user_id, vote_type) VALUES ($1, $2, $3) RETURNING *",
            [postId, userId, voteType]
        );
        return result.rows[0];
    }

    static async delete(postId, userId) {
        const result = await db.query(
            "DELETE FROM votes WHERE post_id = $1 AND user_id = $2 RETURNING *",
            [postId, userId]
        );
        return result.rows[0];
    }
}

module.exports = Votes;