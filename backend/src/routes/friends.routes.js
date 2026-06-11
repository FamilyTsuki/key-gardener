const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friends.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/add', friendsController.addFriend);
router.post('/accept', friendsController.acceptFriend);
router.get('/search', friendsController.searchUsers);
router.get('/list', friendsController.getFriends);
router.delete('/remove/:id', friendsController.removeFriend);
router.get('/profile/:id', friendsController.getProfile);

module.exports = router;
