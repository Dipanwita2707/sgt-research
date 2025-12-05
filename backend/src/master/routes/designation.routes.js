const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const designationController = require('../controllers/designation.controller');

// Get all permission categories (available to authenticated users for viewing their own)
router.get('/permissions/categories', protect, designationController.getPermissionCategories);

// Get all designation templates (superadmin only - will be transferred to HR module later)
router.get('/templates', protect, restrictTo('superadmin'), designationController.getDesignationTemplates);

// Get default permissions for a specific designation (superadmin only - will be transferred to HR module later)
router.get('/templates/:designation', protect, restrictTo('superadmin'), designationController.getDesignationPermissions);

// Get user permissions with designation defaults (superadmin only - will be transferred to HR module later)
router.get('/users/:userId/permissions', protect, restrictTo('superadmin'), designationController.getUserPermissions);

// Update user permissions (superadmin only - will be transferred to HR module later)
router.put('/users/:userId/permissions', protect, restrictTo('superadmin'), designationController.updateUserPermissions);

// Apply designation template to user (superadmin only - will be transferred to HR module later)
router.post('/users/:userId/apply-template', protect, restrictTo('superadmin'), designationController.applyDesignationTemplate);

module.exports = router;
