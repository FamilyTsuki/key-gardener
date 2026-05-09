const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts.controller');
const { apiLimiter } = require('../middlewares/rateLimiter.middleware');

router.get('/', apiLimiter, postsController.getAllPosts);

module.exports = router;
