const express = require('express');
const communityController = require('../controllers/communityController');
const multer = require('multer');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', communityController.getPosts);
router.post('/', upload.single('image'), communityController.createPost);
router.delete('/:id', communityController.deletePost);
router.put('/:id/resolve', communityController.resolveLostFound);

// Contact Owner — only revealed to authenticated users, never in the public feed.
router.get('/:id/contact', isAuthenticated, communityController.getContactInfo);

// Like/Unlike a post
router.post('/:id/like', communityController.toggleLike);

// Comments
router.get('/:id/comments', communityController.getComments);
router.post('/:id/comment', communityController.addComment);

module.exports = router;
