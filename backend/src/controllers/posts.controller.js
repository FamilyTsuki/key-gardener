const db = require("../config/database");

exports.getAllPosts = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                p.id, 
                p.content, 
                p.upvotes, 
                p.created_at, 
                u.username 
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `;
        
        const result = await db.query(query);
        
        res.status(200).json({ success: true, posts: result.rows });
    } catch (err) {
        next(err);
    }
};
