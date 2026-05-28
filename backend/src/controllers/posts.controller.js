const Post = require("../models/Post");
const User = require("../models/User");
const Vote = require("../models/Votes");
const Comment = require("../models/Comment");
const fs = require("fs");
const path = require("path");

exports.getAllPosts = async (req, res, next) => {
    try {
        const currentUserId = req.user ? req.user.id : null;
        const posts = await Post.getAllPosts(currentUserId);
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

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/asset/uploads/posts/${req.file.filename}`;
        }

        if (!content || content.trim().length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "Content is required" });
        }

        const post = await Post.create(userId, content, imageUrl);
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

        if (!content || content.trim().length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "Content is required" });
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

        const now = new Date();
        const postTime = new Date(post.created_at);
        const diffMinutes = (now - postTime) / (1000 * 60);

        if (diffMinutes > 5) {
            return res
                .status(403)
                .json({ success: false, message: "You can only edit a post within 5 minutes of creation" });
        }

        const updatedPost = await Post.update(id, content);
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

        const updatedPost = await Post.findById(postId);
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

        const updatedPost = await Post.findById(postId);
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

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Comment content is required" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
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
