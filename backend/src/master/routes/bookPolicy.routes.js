const express = require('express');
const router = express.Router();
const bookPolicyController = require('../controllers/bookPolicy.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// Get all book policies (admin only)
router.get('/', protect, restrictTo('admin'), bookPolicyController.getAllBookPolicies);

// Get active policy by publication type (any authenticated user - for form preview)
router.get('/active/:publicationType', protect, bookPolicyController.getActivePolicyByType);

// Get policy by ID (admin only)
router.get('/:id', protect, restrictTo('admin'), bookPolicyController.getBookPolicyById);

// Create book policy (admin only)
router.post('/', protect, restrictTo('admin'), bookPolicyController.createBookPolicy);

// Update book policy (admin only)
router.put('/:id', protect, restrictTo('admin'), bookPolicyController.updateBookPolicy);

// Delete book policy (admin only)
router.delete('/:id', protect, restrictTo('admin'), bookPolicyController.deleteBookPolicy);

module.exports = router;
