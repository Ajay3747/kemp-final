const express = require('express');
const chatController = require('../controllers/chatController');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/conversations', isAuthenticated, chatController.getOrCreateConversation);
router.get('/conversations', isAuthenticated, chatController.listConversations);
router.get('/conversations/:conversationId/messages', isAuthenticated, chatController.getMessages);
router.post('/conversations/:conversationId/messages', isAuthenticated, chatController.sendMessage);

module.exports = router;
