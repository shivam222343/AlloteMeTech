const express = require('express');
const router = express.Router();
const { getTopics, getTopic, getTopicProblems } = require('../controllers/topicController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getTopics);
router.get('/:slug', optionalAuth, getTopic);
router.get('/:slug/problems', optionalAuth, getTopicProblems);

module.exports = router;

