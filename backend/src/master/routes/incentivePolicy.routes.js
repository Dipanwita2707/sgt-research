const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const policyController = require('../controllers/incentivePolicy.controller');

// Public route to get policy by type (for applicants to see expected incentives)
router.get('/type/:iprType', protect, policyController.getPolicyByType);

// Calculate incentive for an application (available to all authenticated users)
router.post('/calculate', protect, policyController.calculateIncentive);

// Admin-only routes
router.get('/', protect, restrictTo('admin'), policyController.getAllPolicies);
router.post('/', protect, restrictTo('admin'), policyController.createPolicy);
router.put('/:id', protect, restrictTo('admin'), policyController.updatePolicy);
router.delete('/:id', protect, restrictTo('admin'), policyController.deletePolicy);

module.exports = router;
