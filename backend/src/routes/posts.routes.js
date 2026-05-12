const express = require("express");
const router = express.Router();
const postsController = require("../controllers/posts.controller");
const verifyToken = require("../middlewares/auth.middleware");
const { apiLimiter } = require("../middlewares/rateLimiter.middleware");

router.get("/user/:userId", apiLimiter, postsController.getUserPosts);
router.get("/:id", apiLimiter, postsController.getPostById);
router.get("/", apiLimiter, postsController.getAllPosts);

router.post("/", verifyToken, apiLimiter, postsController.createPost);
router.put("/:id", verifyToken, apiLimiter, postsController.updatePost);
router.delete("/:id", verifyToken, apiLimiter, postsController.deletePost);

router.post("/:id/upvote", apiLimiter, postsController.upvotePost);
router.post("/:id/downvote", apiLimiter, postsController.downvotePost);

module.exports = router;
