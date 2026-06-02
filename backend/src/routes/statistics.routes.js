const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const statisticsController = require("../controllers/statistics.controller");

router.use(verifyToken);

router.route("/")
    .get(statisticsController.getStats)
    .post(statisticsController.updateStats);

module.exports = router;
