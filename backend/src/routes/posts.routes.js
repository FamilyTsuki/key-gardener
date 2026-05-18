const express = require("express");
const router = express.Router();
const postsController = require("../controllers/posts.controller");
const verifyToken = require("../middlewares/auth.middleware");
const { apiLimiter } = require("../middlewares/rateLimiter.middleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../../frontend/public/asset/uploads/posts/");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "post_" + req.user.id + "_" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|ogg|mov/i;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error("Only images (jpeg, jpg, png, gif) and videos (mp4, webm, ogg, mov) are allowed!"), false);
        }
    }
});

router.get("/user/:userId", apiLimiter, postsController.getUserPosts);
router.get("/:id", apiLimiter, postsController.getPostById);
router.get("/", apiLimiter, postsController.getAllPosts);

router.post("/", verifyToken, apiLimiter, upload.single("media"), postsController.createPost);
router.put("/:id", verifyToken, apiLimiter, postsController.updatePost);
router.delete("/:id", verifyToken, apiLimiter, postsController.deletePost);

router.post("/:id/upvote", apiLimiter, postsController.upvotePost);
router.post("/:id/downvote", apiLimiter, postsController.downvotePost);

module.exports = router;
