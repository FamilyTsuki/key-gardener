const db = require("../config/database");

class Save {
    static async findByUserId(userId) {
        const result = await db.query(
            "SELECT * FROM saves WHERE user_id = $1 ORDER BY slot_number ASC",
            [userId]
        );
        return result.rows;
    }

    static async findBySlot(userId, slotNumber) {
        const result = await db.query(
            "SELECT * FROM saves WHERE user_id = $1 AND slot_number = $2",
            [userId, slotNumber]
        );
        return result.rows[0];
    }

    static async createOrUpdate(userId, slotNumber, gameState) {
        const result = await db.query(
            `INSERT INTO saves (user_id, slot_number, game_state, last_played, updated_at) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
             ON CONFLICT (user_id, slot_number) 
             DO UPDATE SET game_state = EXCLUDED.game_state, last_played = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             RETURNING *`,
            [userId, slotNumber, gameState]
        );
        return result.rows[0];
    }

    static async delete(userId, slotNumber) {
        const result = await db.query(
            "DELETE FROM saves WHERE user_id = $1 AND slot_number = $2 RETURNING *",
            [userId, slotNumber]
        );
        return result.rows[0];
    }
}

module.exports = Save;
