const express = require('express');
const router = express.Router();
const grantPolicyController = require('../controllers/grantPolicy.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all grant policies (admin only)
router.get('/', restrictTo('admin'), grantPolicyController.getAllGrantPolicies);

// Get active policy by project category and type (any authenticated user - for form preview)
router.get('/active/:projectCategory/:projectType', grantPolicyController.getActivePolicyByCategoryAndType);

// Get grant policy by ID (admin only)
router.get('/:id', restrictTo('admin'), grantPolicyController.getGrantPolicyById);

// Create grant policy (admin only)
router.post('/', restrictTo('admin'), grantPolicyController.createGrantPolicy);

// Update grant policy (admin only)
router.put('/:id', restrictTo('admin'), grantPolicyController.updateGrantPolicy);

// Delete grant policy (admin only)
router.delete('/:id', restrictTo('admin'), grantPolicyController.deleteGrantPolicy);

module.exports = router;
