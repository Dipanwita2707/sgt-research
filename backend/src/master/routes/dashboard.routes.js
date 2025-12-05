const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

// Role-specific dashboard endpoints
router.get('/student', dashboardController.getStudentDashboard);
router.get('/staff', dashboardController.getStaffDashboard);

module.exports = router;
