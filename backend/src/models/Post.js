const db = require("../config/database");

class Post {
    static async findById(id, currentUserId = null) {
        const result = await db.query(
            `SELECT p.*, u.username,
                    COALESCE((SELECT vote_type FROM votes WHERE post_id = p.id AND user_id = $2), 0) AS user_vote,
                    COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0)::integer AS comment_count
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.id = $1 AND p.status = 'active'`,
            [id, currentUserId]
        );
        return result.rows[0];
    }

    static async getAllPosts(currentUserId = null, sort = "hot") {
        let orderBy = "hot_score DESC, created_at DESC";
        if (sort === "recent") {
            orderBy = "created_at DESC";
        } else if (sort === "upvotes") {
            orderBy = "upvotes DESC, created_at DESC";
        } else if (sort === "comments") {
            orderBy = "comment_count DESC, created_at DESC";
        }

        const result = await db.query(
            `WITH post_base AS (
                SELECT
                    p.id, p.content, p.image_url, p.upvotes, p.downvotes,
                    p.created_at, p.status,
                    u.username, u.id AS user_id,
                    COALESCE(
                        (SELECT vote_type FROM votes WHERE post_id = p.id AND user_id = $1), 0
                    ) AS user_vote,
                    (SELECT COUNT(*) > 0 FROM post_reports WHERE post_id = p.id AND user_id = $1) AS has_reported,
                    COALESCE(
                        (SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0
                    )::integer AS comment_count,
                    (p.upvotes + p.downvotes) AS total_votes,
                    CASE
                        WHEN (p.upvotes + p.downvotes) = 0 THEN 0.0
                        ELSE p.upvotes::float / (p.upvotes + p.downvotes)
                    END AS vote_ratio
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.status = 'active'
            )
            SELECT *,
                (
                    CASE
                        WHEN total_votes = 0 THEN 0.0
                        ELSE (
                            (
                                vote_ratio
                                + 1.9208 / total_votes
                                - 1.96 * SQRT(
                                    (vote_ratio * (1.0 - vote_ratio) + 0.9604 / total_votes)
                                    / total_votes
                                )
                            ) / (1.0 + 3.8416 / total_votes)
                        ) * 10.0
                    END
                    + LEAST(comment_count * 0.5, 5.0)
                    + (10.0 * EXP(- EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 86400.0))
                ) AS hot_score
            FROM post_base
            ORDER BY ${orderBy}`,
            [currentUserId]
        );
        return result.rows;
    }

    static async getPostsByUserId(userId, currentUserId = null) {
        const result = await db.query(
            `SELECT p.id, p.content, p.image_url, p.upvotes, p.downvotes, p.created_at, u.username, u.id as user_id,
                    COALESCE((SELECT vote_type FROM votes WHERE post_id = p.id AND user_id = $2), 0) AS user_vote,
                    (SELECT COUNT(*) > 0 FROM post_reports WHERE post_id = p.id AND user_id = $2) AS has_reported,
                    COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0)::integer AS comment_count
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1 AND p.status = 'active'
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

    static async reportPost(postId, userId, reason) {
        const insertResult = await db.query(
            "INSERT INTO post_reports (post_id, user_id, reason) VALUES ($1, $2, $3) ON CONFLICT (post_id, user_id) DO NOTHING RETURNING id",
            [postId, userId, reason]
        );

        if (insertResult.rowCount === 0) {
            return { alreadyReported: true };
        }

        const countResult = await db.query(
            "SELECT COUNT(*) as count FROM post_reports WHERE post_id = $1",
            [postId]
        );
        const reportCount = parseInt(countResult.rows[0].count);

        if (reportCount >= 3) {
            await db.query("UPDATE posts SET status = 'reported' WHERE id = $1", [postId]);
            return { hidden: true };
        }
        return { hidden: false };
    }

    static async getReportedPosts() {
        const result = await db.query(
            `SELECT p.id, p.content, p.image_url, p.created_at, u.username,
                    (SELECT json_agg(json_build_object('user_id', pr.user_id, 'reason', pr.reason)) FROM post_reports pr WHERE pr.post_id = p.id) as reports
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.status = 'reported'
             ORDER BY p.created_at DESC`
        );
        return result.rows;
    }

    static async approvePost(postId) {
        await db.query("UPDATE posts SET status = 'active' WHERE id = $1", [postId]);
        await db.query("DELETE FROM post_reports WHERE post_id = $1", [postId]);
        return true;
    }
}

module.exports = Post;
