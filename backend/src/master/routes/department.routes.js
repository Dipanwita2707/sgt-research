const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all departments (admin only)
router.get('/', restrictTo('admin'), departmentController.getAllDepartments);

// Get departments by school (admin only)
router.get('/by-school/:schoolId', restrictTo('admin'), departmentController.getDepartmentsBySchool);

// Get department by ID (admin only)
router.get('/:id', restrictTo('admin'), departmentController.getDepartmentById);

// Create department (admin only)
router.post('/', restrictTo('admin'), departmentController.createDepartment);

// Update department (admin only)
router.put('/:id', restrictTo('admin'), departmentController.updateDepartment);

// Delete department (admin only)
router.delete('/:id', restrictTo('admin'), departmentController.deleteDepartment);

// Toggle department status (admin only)
router.patch('/:id/toggle-status', restrictTo('admin'), departmentController.toggleDepartmentStatus);

module.exports = router;
