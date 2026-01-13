const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth');

/**
 * Analytics Routes
 * All routes require authentication
 */

// Get user performance data across terms
router.get(
  '/user/:userId/performance',
  protect,
  analyticsController.getUserPerformance
);

// Get user performance statistics summary
router.get(
  '/user/:userId/stats',
  protect,
  analyticsController.getUserPerformanceStats
);

// Track user activity
router.post(
  '/activity',
  protect,
  analyticsController.trackUserActivity
);

module.exports = router;
