const Statistics = require("../models/Statistics");

exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const stats = await Statistics.findByUserId(userId);
        
        // If the user doesn't have stats yet, return default zero values
        if (!stats) {
            return res.json({
                success: true,
                stats: {
                    highest_wpm: 0,
                    average_wpm: 0,
                    accuracy: 0.00,
                    total_words_typed: 0,
                    enemies_defeated: 0,
                    bosses_defeated: 0,
                    total_playtime_seconds: 0
                }
            });
        }

        res.json({ success: true, stats });
    } catch (err) {
        next(err);
    }
};

exports.updateStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Expected payload format
        const {
            wpm = 0,
            accuracy = 0,
            wordsTyped = 0,
            enemiesDefeated = 0,
            bossesDefeated = 0,
            playtimeSeconds = 0
        } = req.body;

        const updatedStats = await Statistics.createOrUpdate(userId, {
            wpm,
            accuracy,
            wordsTyped,
            enemiesDefeated,
            bossesDefeated,
            playtimeSeconds
        });

        res.json({ success: true, stats: updatedStats, message: "Stats updated successfully" });
    } catch (err) {
        next(err);
    }
};
