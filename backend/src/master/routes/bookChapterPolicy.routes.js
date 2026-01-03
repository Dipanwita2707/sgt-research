const express = require('express');
const router = express.Router();
const bookChapterPolicyController = require('../controllers/bookChapterPolicy.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all book chapter policies (admin only)
router.get('/', restrictTo('admin'), bookChapterPolicyController.getAllBookChapterPolicies);

// Get active book chapter policy (any authenticated user)
router.get('/active', bookChapterPolicyController.getActivePolicy);

// Get book chapter policy by ID (admin only)
router.get('/:id', restrictTo('admin'), bookChapterPolicyController.getBookChapterPolicyById);

// Create book chapter policy (admin only)
router.post('/', restrictTo('admin'), bookChapterPolicyController.createBookChapterPolicy);

// Update book chapter policy (admin only)
router.put('/:id', restrictTo('admin'), bookChapterPolicyController.updateBookChapterPolicy);

// Delete book chapter policy (admin only)
router.delete('/:id', restrictTo('admin'), bookChapterPolicyController.deleteBookChapterPolicy);

module.exports = router;
