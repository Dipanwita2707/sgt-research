const express = require('express');
const router = express.Router();
const conferencePolicyController = require('../controllers/conferencePolicy.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all conference policies (admin only)
router.get('/', restrictTo('admin'), conferencePolicyController.getAllConferencePolicies);

// Get active policy by sub-type (any authenticated user - for form preview)
router.get('/active/:subType', conferencePolicyController.getActivePolicyBySubType);

// Get conference policy by ID (admin only)
router.get('/:id', restrictTo('admin'), conferencePolicyController.getConferencePolicyById);

// Create conference policy (admin only)
router.post('/', restrictTo('admin'), conferencePolicyController.createConferencePolicy);

// Update conference policy (admin only)
router.put('/:id', restrictTo('admin'), conferencePolicyController.updateConferencePolicy);

// Delete conference policy (admin only)
router.delete('/:id', restrictTo('admin'), conferencePolicyController.deleteConferencePolicy);

module.exports = router;
