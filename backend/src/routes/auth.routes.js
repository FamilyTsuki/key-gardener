const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authLimiter } = require("../middlewares/rateLimiter.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../../frontend/public/asset/img/users/"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "user_" + req.user.id + "_" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Not an image! Please upload an image."), false);
        }
    }
});

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/logout", authController.logout);
router.post("/google", authLimiter, authController.loginWithGoogle);
router.get("/me", authMiddleware.optional, authController.me);
router.post("/upload-avatar", authMiddleware, upload.single("avatar"), authController.uploadAvatar);
router.post("/update-username", authMiddleware, authController.updateUsername);
router.post("/update-email", authMiddleware, authController.updateEmail);
router.post("/forgot-password", authLimiter, authController.requestPasswordReset);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.post("/change-password", authMiddleware, authController.changePassword);
router.patch("/settings", authMiddleware, authController.updateSettings);

module.exports = router;
