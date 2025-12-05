const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const permissionController = require('../controllers/permission.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All permission routes require authentication
router.use(protect);

// Get user permissions
router.get('/user/:userId', permissionController.getUserPermissions);

// Check permission
router.get('/check', permissionController.checkPermission);

// Admin only routes - TODO: Transfer to HR module when implemented
router.post('/grant', restrictTo('admin'), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('permissions').isObject().withMessage('Permissions must be an object')
], permissionController.grantPermissions);

router.post('/revoke', restrictTo('admin'), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('department').notEmpty().withMessage('Department is required')
], permissionController.revokePermissions);

module.exports = router;
