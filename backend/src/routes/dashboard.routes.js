const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

router.get('/', dashboardController.getDashboard);
router.get('/modules', dashboardController.getAvailableModules);

module.exports = router;
