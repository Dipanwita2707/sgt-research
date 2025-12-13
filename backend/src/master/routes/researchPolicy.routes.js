const express = require('express');
const router = express.Router();
const policyController = require('../controllers/researchPolicy.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// Get all research policies (admin only)
router.get('/', protect, restrictTo('admin'), policyController.getAllPolicies);

// Get policy by publication type (any authenticated user)
router.get('/type/:publicationType', protect, policyController.getPolicyByType);

// Create research policy (admin only)
router.post('/', protect, restrictTo('admin'), policyController.createPolicy);

// Update research policy (admin only)
router.put('/:id', protect, restrictTo('admin'), policyController.updatePolicy);

// Delete research policy (admin only)
router.delete('/:id', protect, restrictTo('admin'), policyController.deletePolicy);

module.exports = router;
