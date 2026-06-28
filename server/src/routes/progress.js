const express = require('express');
const router = express.Router();
const {
  upsertProgress,
  getUserProgress,
  getScheduled,
  getDashboardStats,
  getRecommendation,
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');
const { validate, progressSchema } = require('../middleware/validate');

router.use(protect);

router.get('/', getUserProgress);
router.post('/', validate(progressSchema), upsertProgress);
router.get('/scheduled', getScheduled);
router.get('/dashboard', getDashboardStats);
router.get('/recommendation', getRecommendation);

module.exports = router;

