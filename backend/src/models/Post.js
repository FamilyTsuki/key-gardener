const db = require("../config/database");

class Post {
    static async findById(id) {
        const result = await db.query(
            `SELECT p.*, u.username FROM posts p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async getAllPosts() {
        const result = await db.query(
            `SELECT p.id, p.content, p.upvotes, p.created_at, u.username, u.id as user_id
             FROM posts p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`
        );
        return result.rows;
    }

    static async getPostsByUserId(userId) {
        const result = await db.query(
            `SELECT p.id, p.content, p.upvotes, p.created_at, u.username
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async create(userId, content) {
        const result = await db.query(
            "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id, user_id, content, upvotes, created_at",
            [userId, content]
        );
        return result.rows[0];
    }

    static async update(id, content) {
        const result = await db.query(
            "UPDATE posts SET content = $1 WHERE id = $2 RETURNING id, user_id, content, upvotes, created_at",
            [content, id]
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

    static async upvote(id) {
        const result = await db.query(
            "UPDATE posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING id, upvotes",
            [id]
        );
        return result.rows[0];
    }

    static async downvote(id) {
        const result = await db.query(
            "UPDATE posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = $1 RETURNING id, upvotes",
            [id]
        );
        return result.rows[0];
    }
}

module.exports = Post;
