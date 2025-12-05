const express = require('express');
const router = express.Router();
const centralDeptController = require('../controllers/centralDepartment.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// GET all central departments
router.get('/', centralDeptController.getAllCentralDepartments);

// GET central department by ID
router.get('/:id', centralDeptController.getCentralDepartmentById);

// POST create new central department
router.post('/', centralDeptController.createCentralDepartment);

// PUT update central department
router.put('/:id', centralDeptController.updateCentralDepartment);

// DELETE central department
router.delete('/:id', centralDeptController.deleteCentralDepartment);

// PATCH toggle central department status
router.patch('/:id/toggle-status', centralDeptController.toggleCentralDepartmentStatus);

module.exports = router;
