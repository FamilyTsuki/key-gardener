const express = require("express");
const router = express.Router();
const levelsController = require("../controllers/levels.controller");
const requireAdmin = require("../middlewares/admin.middleware");

router.get("/", levelsController.getAllLevelsConfig);
router.get("/:level", levelsController.getLevelConfig);

router.put("/:level", requireAdmin, levelsController.updateLevelConfig);
router.delete("/:level", requireAdmin, levelsController.deleteLevelConfig);

module.exports = router;
