const db = require("../config/database");

exports.getLevelConfig = async (req, res, next) => {
    try {
        const { level } = req.params;
        const result = await db.query("SELECT * FROM levels_config WHERE level_number = $1", [level]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Level configuration not found" });
        }
        
        res.json({ success: true, config: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

exports.updateLevelConfig = async (req, res, next) => {
    try {
        const { level } = req.params;
        const { phase_type, options } = req.body;
        
        if (!phase_type || !options) {
            return res.status(400).json({ success: false, message: "phase_type and options are required" });
        }
        
        const result = await db.query(
            `INSERT INTO levels_config (level_number, phase_type, options) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (level_number) 
             DO UPDATE SET phase_type = $2, options = $3 
             RETURNING *`,
            [level, phase_type, options]
        );
        
        res.json({ success: true, config: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

exports.getAllLevelsConfig = async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM levels_config ORDER BY level_number ASC");
        res.json({ success: true, configs: result.rows });
    } catch (err) {
        next(err);
    }
};

exports.deleteLevelConfig = async (req, res, next) => {
    try {
        const { level } = req.params;
        const result = await db.query("DELETE FROM levels_config WHERE level_number = $1 RETURNING *", [level]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Level not found" });
        }
        res.json({ success: true, message: "Level deleted successfully" });
    } catch (err) {
        next(err);
    }
};
