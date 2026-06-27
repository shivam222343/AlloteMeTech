const express = require('express');
const router = express.Router();
const {
  getStats,
  getUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  createCompany,
  updateCompany,
  deleteCompany,
  getProblems,
  createProblem,
  updateProblem,
  deleteProblem,
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getAnalytics,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Stats
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Companies
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

// Problems
router.get('/problems', getProblems);
router.post('/problems', createProblem);
router.put('/problems/:id', updateProblem);
router.delete('/problems/:id', deleteProblem);

// Topics
router.get('/topics', getTopics);
router.post('/topics', createTopic);
router.put('/topics/:id', updateTopic);
router.delete('/topics/:id', deleteTopic);

module.exports = router;
