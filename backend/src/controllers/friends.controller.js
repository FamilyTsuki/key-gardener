const db = require('../config/database');

exports.addFriend = async (req, res) => {
    try {
        const { targetUsername } = req.body;
        const userId = req.user.id;

        const targetRes = await db.query('SELECT id FROM users WHERE username = $1', [targetUsername]);
        if (targetRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        }
        const targetId = targetRes.rows[0].id;

        if (userId === targetId) {
            return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous ajouter vous-même.' });
        }

        const checkRes = await db.query(
            'SELECT * FROM friends WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
            [userId, targetId]
        );

        if (checkRes.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Demande déjà envoyée ou vous êtes déjà amis.' });
        }

        await db.query(
            'INSERT INTO friends (user_id_1, user_id_2, status) VALUES ($1, $2, $3)',
            [userId, targetId, 'pending']
        );

        res.json({ success: true, message: 'Demande d\'ami envoyée.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.acceptFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user.id;

        await db.query(
            'UPDATE friends SET status = $1 WHERE user_id_1 = $2 AND user_id_2 = $3 AND status = $4',
            ['accepted', friendId, userId, 'pending']
        );

        res.json({ success: true, message: 'Demande d\'ami acceptée.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT 
                f.id as friend_row_id,
                f.status,
                u.id as user_id,
                u.username,
                u.personal_picture,
                CASE WHEN f.user_id_1 = $1 THEN 'sent' ELSE 'received' END as direction
            FROM friends f
            JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2) AND u.id != $1
            WHERE f.user_id_1 = $1 OR f.user_id_2 = $1
        `, [userId]);

        res.json({ success: true, friends: result.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await db.query(
            'DELETE FROM friends WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
            [userId, id]
        );

        res.json({ success: true, message: 'Ami supprimé.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.user.id;
        
        if (!q || q.trim().length < 2) {
            return res.json({ success: true, users: [] });
        }

        const searchTerm = `%${q.trim()}%`;
        
        const result = await db.query(`
            SELECT id, username, personal_picture
            FROM users
            WHERE username ILIKE $1 AND id != $2
            LIMIT 5
        `, [searchTerm, userId]);

        res.json({ success: true, users: result.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT id, username, personal_picture FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = result.rows[0];

        const statsResult = await db.query('SELECT * FROM user_statistics WHERE user_id = $1', [id]);
        let stats = null;
        if (statsResult.rows.length > 0) {
            stats = statsResult.rows[0];
        } else {
            stats = {
                highest_wpm: 0,
                average_wpm: 0,
                accuracy: 0.00,
                total_words_typed: 0,
                enemies_defeated: 0,
                bosses_defeated: 0,
                total_playtime_seconds: 0
            };
        }

        const friendCheck = await db.query(
            'SELECT * FROM friends WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
            [req.user.id, id]
        );
        let friendStatus = null;
        if (friendCheck.rows.length > 0) {
            friendStatus = friendCheck.rows[0].status;
        }

        res.json({ success: true, user, stats, friendStatus });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};
