const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authLimiter } = require("../middlewares/rateLimiter.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
