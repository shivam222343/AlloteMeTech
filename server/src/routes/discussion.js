const express = require('express');
const router = express.Router();
const {
  getMessages,
  createMessage,
  editMessage,
  deleteMessage,
  reactMessage,
  searchMentions,
} = require('../controllers/discussionController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public
router.get('/', optionalAuth, getMessages);
router.get('/mentions/search', searchMentions);

// Auth required
router.post('/', protect, createMessage);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/:id/react', protect, reactMessage);

module.exports = router;
