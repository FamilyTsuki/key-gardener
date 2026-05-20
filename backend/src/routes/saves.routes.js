const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const savesController = require("../controllers/saves.controller");

router.use(verifyToken);

router.route("/")
    .get(savesController.getSaves)
    .post(savesController.saveGame);

router.route("/:slot")
    .get(savesController.getSaveBySlot)
    .delete(savesController.deleteSave);

module.exports = router;
