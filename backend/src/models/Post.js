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
            `SELECT p.id, p.content, p.image_url, p.upvotes, p.downvotes, p.created_at, u.username, u.id as user_id
             FROM posts p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`
        );
        return result.rows;
    }

    static async getPostsByUserId(userId) {
        const result = await db.query(
            `SELECT p.id, p.content, p.image_url, p.upvotes, p.downvotes, p.created_at, u.username
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
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

    static async upvote(id) {
        const result = await db.query(
            "UPDATE posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING id, upvotes",
            [id]
        );
        return result.rows[0];
    }

    static async downvote(id) {
        const result = await db.query(
            "UPDATE posts SET downvotes = downvotes + 1 WHERE id = $1 RETURNING id, downvotes",
            [id]
        );
        return result.rows[0];
    }
}

module.exports = Post;
