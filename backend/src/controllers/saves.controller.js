const Save = require("../models/Save");

exports.getSaves = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const saves = await Save.findByUserId(userId);
        res.json({ success: true, saves });
    } catch (err) {
        next(err);
    }
};

exports.getSaveBySlot = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const slotNumber = parseInt(req.params.slot, 10);

        if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 3) {
            return res.status(400).json({ success: false, message: "Invalid slot number" });
        }

        const save = await Save.findBySlot(userId, slotNumber);
        if (!save) {
            return res.status(404).json({ success: false, message: "Save not found" });
        }

        res.json({ success: true, save });
    } catch (err) {
        next(err);
    }
};

exports.saveGame = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { slotNumber, gameState } = req.body;

        const parsedSlot = parseInt(slotNumber, 10);
        if (isNaN(parsedSlot) || parsedSlot < 1 || parsedSlot > 3) {
            return res.status(400).json({ success: false, message: "Invalid slot number" });
        }

        if (!gameState) {
            return res.status(400).json({ success: false, message: "Game state is required" });
        }

        const save = await Save.createOrUpdate(userId, parsedSlot, gameState);
        res.json({ success: true, save, message: "Game saved successfully" });
    } catch (err) {
        next(err);
    }
};

exports.deleteSave = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const slotNumber = parseInt(req.params.slot, 10);

        if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 3) {
            return res.status(400).json({ success: false, message: "Invalid slot number" });
        }

        const save = await Save.delete(userId, slotNumber);
        if (!save) {
            return res.status(404).json({ success: false, message: "Save slot is already empty" });
        }

        res.json({ success: true, message: "Save deleted successfully" });
    } catch (err) {
        next(err);
    }
};
