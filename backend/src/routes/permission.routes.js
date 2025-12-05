const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const permissionController = require('../controllers/permission.controller');
const { protect, restrictTo } = require('../middleware/auth');

// All permission routes require authentication
router.use(protect);

// Get user permissions
router.get('/user/:userId', permissionController.getUserPermissions);

// Get all available permissions
router.get('/all', permissionController.getAllPermissions);

// Admin only routes
router.post('/grant', restrictTo('admin'), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('permissionIds').isArray().withMessage('Permission IDs must be an array')
], permissionController.grantPermissions);

router.post('/revoke', restrictTo('admin'), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('permissionIds').isArray().withMessage('Permission IDs must be an array')
], permissionController.revokePermissions);

router.put('/update', restrictTo('admin'), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('permissionIds').isArray().withMessage('Permission IDs must be an array')
], permissionController.updateUserPermissions);

module.exports = router;
