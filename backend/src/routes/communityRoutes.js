const express = require('express');
const communityController = require('../controllers/communityController');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', communityController.getPosts);
router.post('/', upload.single('image'), communityController.createPost);
router.delete('/:id', communityController.deletePost);

// Like/Unlike a post
router.post('/:id/like', communityController.toggleLike);

// Comments
router.get('/:id/comments', communityController.getComments);
router.post('/:id/comment', communityController.addComment);

module.exports = router;
