const db = require("../config/database");

class Statistics {
    static async findByUserId(userId) {
        const result = await db.query(
            "SELECT * FROM user_statistics WHERE user_id = $1",
            [userId]
        );
        return result.rows[0];
    }

    static async createOrUpdate(userId, statsData) {
        const {
            wpm,
            accuracy,
            wordsTyped,
            enemiesDefeated,
            bossesDefeated,
            playtimeSeconds,
        } = statsData;

        const currentStats = await this.findByUserId(userId);

        if (!currentStats) {
            const result = await db.query(
                `INSERT INTO user_statistics (user_id, highest_wpm, average_wpm, accuracy, total_words_typed, enemies_defeated, bosses_defeated, total_playtime_seconds, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [
                    userId,
                    wpm,
                    wpm, // initial average is just the first wpm
                    accuracy,
                    wordsTyped,
                    enemiesDefeated,
                    bossesDefeated,
                    playtimeSeconds,
                ]
            );
            return result.rows[0];
        } else {
            const highestWpm = Math.max(currentStats.highest_wpm, wpm);
            // Simple moving average or cumulative calculation for average WPM
            // Ideally we'd need total matches, but since we don't have it, we'll do a simple moving average
            // A better way is: (current average + new) / 2 as an approximation for now.
            const newAverageWpm = Math.round((currentStats.average_wpm + wpm) / 2);
            
            // For accuracy, similar logic: average out
            const newAccuracy = (parseFloat(currentStats.accuracy) + parseFloat(accuracy)) / 2;

            const newWordsTyped = currentStats.total_words_typed + wordsTyped;
            const newEnemiesDefeated = currentStats.enemies_defeated + enemiesDefeated;
            const newBossesDefeated = currentStats.bosses_defeated + bossesDefeated;
            const newPlaytime = currentStats.total_playtime_seconds + playtimeSeconds;

            const result = await db.query(
                `UPDATE user_statistics 
                 SET highest_wpm = $1, average_wpm = $2, accuracy = $3, total_words_typed = $4, 
                     enemies_defeated = $5, bosses_defeated = $6, total_playtime_seconds = $7, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $8
                 RETURNING *`,
                [
                    highestWpm,
                    newAverageWpm,
                    newAccuracy.toFixed(2),
                    newWordsTyped,
                    newEnemiesDefeated,
                    newBossesDefeated,
                    newPlaytime,
                    userId,
                ]
            );
            return result.rows[0];
        }
    }
}

module.exports = Statistics;
