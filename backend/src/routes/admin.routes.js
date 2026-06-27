const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * Retrieves the filesfromdir.
 * @param {any} dirPath - The dirPath.
 */
const getFilesFromDir = (dirPath) => {
    try {
        const absolutePath = path.join(__dirname, '../../../frontend/src/game', dirPath);
        if (!fs.existsSync(absolutePath)) return [];
        return fs.readdirSync(absolutePath)
            .filter(file => file.endsWith('.js') && file !== 'GamePhase.js' && file !== 'GameEvent.js' && file !== 'Actor.js')
            .map(file => file.replace('.js', ''));
    } catch (err) {
        console.error(`Error reading ${dirPath}:`, err);
        return [];
    }
};

router.get('/entities', (req, res) => {
    try {
        const phases = getFilesFromDir('phases');
        const events = getFilesFromDir('events');
        
        const actors = getFilesFromDir('models/actors');
        const enemies = actors.filter(a => a !== 'Player');

        res.json({
            phases,
            events,
            enemies
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read game entities' });
    }
});

module.exports = router;
