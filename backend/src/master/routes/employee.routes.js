const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const employeeController = require('../controllers/employee.controller');

// All routes require admin access
router.use(protect, restrictTo('admin'));

// Create new employee
router.post('/', employeeController.createEmployee);

// Get all employees with filters
router.get('/', employeeController.getAllEmployees);

// Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// Update employee
router.put('/:id', employeeController.updateEmployee);

// Toggle employee status (active/inactive)
router.patch('/:id/toggle-status', employeeController.toggleEmployeeStatus);

module.exports = router;
