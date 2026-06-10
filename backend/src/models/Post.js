const db = require("../config/database");

class Post {
    static async findById(id, currentUserId = null) {
        const result = await db.query(
            `SELECT p.*, u.username,
                    COALESCE((SELECT vote_type FROM votes WHERE post_id = p.id AND user_id = $2), 0) AS user_vote,
                    COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0)::integer AS comment_count
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.id = $1`,
            [id, currentUserId]
        );
        return result.rows[0];
    }

    static async getAllPosts(currentUserId = null, sort = "hot") {
        let orderBy = "hot_score DESC, p.created_at DESC";
        if (sort === "recent") {
            orderBy = "p.created_at DESC";
        } else if (sort === "upvotes") {
            orderBy = "p.upvotes DESC, p.created_at DESC";
        } else if (sort === "comments") {
            orderBy = "comment_count DESC, p.created_at DESC";
        }

        const result = await db.query(
            `SELECT p.id, p.content, p.image_url, p.upvotes, p.downvotes, p.created_at, u.username, u.id as user_id,
                    COALESCE((SELECT vote_type FROM votes WHERE post_id = p.id AND user_id = $1), 0) AS user_vote,
                    COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0)::integer AS comment_count,
                    (
                        (p.upvotes * 1.0) - (p.downvotes * 0.75) 
                        + 
                        (10.0 * EXP(- EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) / 86400.0))
                    ) AS hot_score
             FROM posts p
             JOIN users u ON p.user_id = u.id
             ORDER BY ${orderBy}`,
            [currentUserId]
        );
        return result.rows;
    }

    static async getPostsByUserId(userId, currentUserId = null) {
        const result = await db.query(
            `SELECT p.id, p.content, p.image_url, p.upvotes, p.downvotes, p.created_at, u.username,
                    COALESCE((SELECT vote_type FROM votes WHERE post_id = p.id AND user_id = $2), 0) AS user_vote,
                    COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0)::integer AS comment_count
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`,
            [userId, currentUserId]
        );
        return result.rows;
    }

    static async create(userId, content, imageUrl = null) {
        const result = await db.query(
            "INSERT INTO posts (user_id, content, image_url) VALUES ($1, $2, $3) RETURNING id, user_id, content, image_url, upvotes, created_at",
            [userId, content, imageUrl]
        );
        return result.rows[0];
    }

    static async update(id, content, imageUrl = null) {
        const result = await db.query(
            "UPDATE posts SET content = $1, image_url = $2 WHERE id = $3 RETURNING id, user_id, content, image_url, upvotes, created_at",
            [content, imageUrl, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(
            "DELETE FROM posts WHERE id = $1 RETURNING id",
            [id]
        );
        return result.rows[0];
    }

    static async incrementUpvotes(id) {
        const result = await db.query(
            "UPDATE posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING id, upvotes",
            [id]
        );
        return result.rows[0];
    }

    static async decrementUpvotes(id) {
        const result = await db.query(
            "UPDATE posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = $1 RETURNING id, upvotes",
            [id]
        );
        return result.rows[0];
    }

    static async incrementDownvotes(id) {
        const result = await db.query(
            "UPDATE posts SET downvotes = downvotes + 1 WHERE id = $1 RETURNING id, downvotes",
            [id]
        );
        return result.rows[0];
    }

    static async decrementDownvotes(id) {
        const result = await db.query(
            "UPDATE posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = $1 RETURNING id, downvotes",
            [id]
        );
        return result.rows[0];
    }

    static async getLastPostTimestamp(userId) {
        const result = await db.query(
            "SELECT created_at FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
            [userId]
        );
        return result.rows[0]?.created_at || null;
    }
}

module.exports = Post;
