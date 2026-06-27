const Post = require("../models/Post");
const User = require("../models/User");
const Vote = require("../models/Votes");
const Comment = require("../models/Comment");
const fs = require("fs");
const path = require("path");
const imageModerator = require("../utils/imageModerator");
const textModerator = require("../utils/textModerator");

exports.getAllPosts = async (req, res, next) => {
    try {
        const currentUserId = req.user ? req.user.id : null;
        const sort = req.query.sort || "hot";
        const posts = await Post.getAllPosts(currentUserId, sort);
        res.status(200).json({ success: true, posts });
    } catch (err) {
        next(err);
    }
};

exports.getPostById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user ? req.user.id : null;
        const post = await Post.findById(id, currentUserId);

        if (!post) {
            return res
                .status(404)
                .json({ success: false, message: "Post not found" });
        }

        res.status(200).json({ success: true, post });
    } catch (err) {
        next(err);
    }
};

exports.getUserPosts = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user ? req.user.id : null;
        const posts = await Post.getPostsByUserId(userId, currentUserId);
        res.status(200).json({ success: true, posts });
    } catch (err) {
        next(err);
    }
};

exports.createPost = async (req, res, next) => {
    try {
        const { content } = req.body;
        const userId = req.user.id;

        if (content && content.length > 1000) {
            return res.status(400).json({ success: false, message: "Content exceeds maximum length of 1000 characters." });
        }

        if (req.user && req.user.warning_count >= 40) {
            return res.status(403).json({
                success: false,
                message: "Your account has been suspended from the hub due to repeated violations."
            });
        }

        const lastPostTime = await Post.getLastPostTimestamp(userId);
        if (lastPostTime) {
            const timeDiff = (new Date() - new Date(lastPostTime)) / 1000;
            if (timeDiff < 10) {
                return res.status(429).json({
                    success: false,
                    message: "You are posting too fast. Please wait a few seconds."
                });
            }
        }

        let imageUrl = null;
        if (req.file) {
            if (await textModerator.hasInappropriateContent(req.file.originalname)) {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                const newWarningCount = await User.incrementWarningCount(userId);
                return res.status(400).json({
                    success: false,
                    isModerated: true,
                    flaggedType: "text",
                    warningCount: newWarningCount,
                    message: "Inappropriate language detected in the file name."
                });
            }

            if (req.file.mimetype.startsWith("image/")) {
                try {
                    const safeSearchData = await imageModerator.analyzeImage(req.file.path);
                    const isFlagged = imageModerator.isImageInappropriate(safeSearchData);

                    if (isFlagged) {
                        if (fs.existsSync(req.file.path)) {
                            fs.unlinkSync(req.file.path);
                        }
                        const newWarningCount = await User.incrementWarningCount(userId);
                        return res.status(400).json({
                            success: false,
                            isModerated: true,
                            flaggedType: "image",
                            warningCount: newWarningCount,
                            message: "Inappropriate content detected in the image."
                        });
                    }
                    
                    const sharp = require("sharp");
                    const webpFilename = req.file.filename.substring(0, req.file.filename.lastIndexOf('.')) + '.webp';
                    const webpPath = path.join(path.dirname(req.file.path), webpFilename);

                    await sharp(req.file.path)
                        .resize({ width: 1200, withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toFile(webpPath);

                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    imageUrl = `/asset/uploads/posts/${webpFilename}`;
                } catch (error) {
                    console.error("Image moderation or conversion failed:", error);
                    imageUrl = `/asset/uploads/posts/${req.file.filename}`;
                }
            } else {
                imageUrl = `/asset/uploads/posts/${req.file.filename}`;
            }
        }

        const textContent = content ? content.trim() : "";

        if (textContent.length === 0 && !req.file) {
            return res
                .status(400)
                .json({ success: false, message: "Content or image is required" });
        }

        if (textContent.length > 0) {
            if (await textModerator.hasInappropriateContent(textContent)) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                const newWarningCount = await User.incrementWarningCount(userId);
                return res.status(400).json({
                    success: false,
                    isModerated: true,
                    flaggedType: "text",
                    warningCount: newWarningCount,
                    message: "Inappropriate language detected in the content."
                });
            }
        }

        const createdPost = await Post.create(userId, textContent, imageUrl);
        const post = await Post.findById(createdPost.id, userId);
        res.status(201).json({ success: true, post });
    } catch (err) {
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (content && content.length > 1000) {
            return res.status(400).json({ success: false, message: "Content exceeds maximum length of 1000 characters." });
        }

        if (req.user && req.user.warning_count >= 4) {
            return res.status(403).json({
                success: false,
                message: "Your account has been suspended from the hub due to repeated violations."
            });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res
                .status(404)
                .json({ success: false, message: "Post not found" });
        }

        if (post.user_id !== userId) {
            return res
                .status(403)
                .json({ success: false, message: "You can only edit your own posts" });
        }

        const textContent = content ? content.trim() : "";
        if (textContent.length === 0 && !post.image_url) {
            return res
                .status(400)
                .json({ success: false, message: "Content or image is required" });
        }

        const now = new Date();
        const postTime = new Date(post.created_at);
        const diffMinutes = (now - postTime) / (1000 * 60);

        if (diffMinutes > 5) {
            return res
                .status(403)
                .json({ success: false, message: "You can only edit a post within 5 minutes of creation" });
        }

        if (textContent.length > 0) {
            if (await textModerator.hasInappropriateContent(textContent)) {
                const newWarningCount = await User.incrementWarningCount(userId);
                return res.status(400).json({
                    success: false,
                    isModerated: true,
                    flaggedType: "text",
                    warningCount: newWarningCount,
                    message: "Inappropriate language detected in the content."
                });
            }
        }

        await Post.update(id, textContent, post.image_url);
        const updatedPost = await Post.findById(id, userId);
        res.status(200).json({ success: true, post: updatedPost });
    } catch (err) {
        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const post = await Post.findById(id);

        if (!post) {
            return res
                .status(404)
                .json({ success: false, message: "Post not found" });
        }

        if (post.user_id !== userId) {
            return res
                .status(403)
                .json({ success: false, message: "You can only delete your own posts" });
        }

        if (post.image_url) {
            const filepath = path.join(__dirname, "../../../../frontend/public", post.image_url);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }

        await Post.delete(id);
        res.status(200).json({ success: true, message: "Post deleted" });
    } catch (err) {
        next(err);
    }
};

exports.upvotePost = async (req, res, next) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res
                .status(404)
                .json({ success: false, message: "Post not found" });
        }

        const existingVote = await Vote.findByPostAndUser(postId, userId);

        if (!existingVote) {
            await Vote.create(postId, userId, 1);
            await Post.incrementUpvotes(postId);
        } else if (existingVote.vote_type === 1) {
            await Vote.delete(postId, userId);
            await Post.decrementUpvotes(postId);
        } else if (existingVote.vote_type === -1) {
            await Vote.delete(postId, userId);
            await Post.decrementDownvotes(postId);
            await Vote.create(postId, userId, 1);
            await Post.incrementUpvotes(postId);
        }

        const updatedPost = await Post.findById(postId, userId);
        res.status(200).json({ success: true, post: updatedPost });
    } catch (err) {
        next(err);
    }
};

exports.downvotePost = async (req, res, next) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res
                .status(404)
                .json({ success: false, message: "Post not found" });
        }

        const existingVote = await Vote.findByPostAndUser(postId, userId);

        if (!existingVote) {
            await Vote.create(postId, userId, -1);
            await Post.incrementDownvotes(postId);
        } else if (existingVote.vote_type === -1) {
            await Vote.delete(postId, userId);
            await Post.decrementDownvotes(postId);
        } else if (existingVote.vote_type === 1) {
            await Vote.delete(postId, userId);
            await Post.decrementUpvotes(postId);
            await Vote.create(postId, userId, -1);
            await Post.incrementDownvotes(postId);
        }

        const updatedPost = await Post.findById(postId, userId);
        res.status(200).json({ success: true, post: updatedPost });
    } catch (err) {
        next(err);
    }
};

exports.getComments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const comments = await Comment.getByPostId(id);
        res.status(200).json({ success: true, comments });
    } catch (err) {
        next(err);
    }
};

exports.addComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (content && content.length > 1000) {
            return res.status(400).json({ success: false, message: "Content exceeds maximum length of 1000 characters." });
        }

        if (req.user && req.user.warning_count >= 4) {
            return res.status(403).json({
                success: false,
                message: "Your account has been suspended from the hub due to repeated violations."
            });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Comment content is required" });
        }

        const lastCommentTime = await Comment.getLastCommentTimestamp(userId);
        if (lastCommentTime) {
            const timeDiff = (new Date() - new Date(lastCommentTime)) / 1000;
            if (timeDiff < 10) {
                return res.status(429).json({
                    success: false,
                    message: "You are commenting too fast. Please wait a few seconds."
                });
            }
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (await textModerator.hasInappropriateContent(content)) {
            const newWarningCount = await User.incrementWarningCount(userId);
            return res.status(400).json({
                success: false,
                isModerated: true,
                flaggedType: "text",
                warningCount: newWarningCount,
                message: "Inappropriate language detected in the content."
            });
        }

        const comment = await Comment.create(id, userId, content);
        res.status(201).json({ success: true, comment });
    } catch (err) {
        next(err);
    }
};

exports.deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const deleted = await Comment.delete(commentId, userId);
        if (!deleted) {
            return res.status(403).json({ success: false, message: "Not authorized or comment not found" });
        }

        res.status(200).json({ success: true, message: "Comment deleted" });
    } catch (err) {
        next(err);
    }
};

exports.contestModeration = async (req, res, next) => {
    try {
        const { content, flaggedType } = req.body;
        const userEmail = req.user.email;

        if (!content || !flaggedType) {
            return res.status(400).json({ success: false, message: "Missing content or flaggedType" });
        }

        const logsDir = path.join(__dirname, "../../logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const logPath = path.join(logsDir, "contested_reports.log");
        const logEntry = `[${new Date().toISOString()}] Email: ${userEmail} | Type: ${flaggedType} | Content: "${content.replace(/\r?\n|\r/g, " ")}"\n`;

        fs.appendFileSync(logPath, logEntry, "utf8");

        res.status(200).json({ success: true, message: "Contest report registered successfully" });
    } catch (err) {
        next(err);
    }
};

exports.reportPost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Reason is required" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        const result = await Post.reportPost(id, userId, reason.trim());

        if (result.alreadyReported) {
            return res.status(400).json({ success: false, message: "You have already reported this post." });
        }

        res.status(200).json({ success: true, hidden: result.hidden, message: "Post reported successfully" });
    } catch (err) {
        next(err);
    }
};

exports.getReportedPosts = async (req, res, next) => {
    try {
        if (!req.user || !req.user.is_admin) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const posts = await Post.getReportedPosts();
        res.status(200).json({ success: true, posts });
    } catch (err) {
        next(err);
    }
};

exports.approvePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!req.user || !req.user.is_admin) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        await Post.approvePost(id);
        res.status(200).json({ success: true, message: "Post approved" });
    } catch (err) {
        next(err);
    }
};
