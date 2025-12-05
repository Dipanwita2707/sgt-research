const express = require('express');
const router = express.Router();
const programController = require('../controllers/program.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get program types (admin only)
router.get('/types', restrictTo('admin'), programController.getProgramTypes);

// Get all programs (admin only)
router.get('/', restrictTo('admin'), programController.getAllPrograms);

// Get programs by department (admin only)
router.get('/by-department/:departmentId', restrictTo('admin'), programController.getProgramsByDepartment);

// Get program by ID (admin only)
router.get('/:id', restrictTo('admin'), programController.getProgramById);

// Create program (admin only)
router.post('/', restrictTo('admin'), programController.createProgram);

// Update program (admin only)
router.put('/:id', restrictTo('admin'), programController.updateProgram);

// Delete program (admin only)
router.delete('/:id', restrictTo('admin'), programController.deleteProgram);

// Toggle program status (admin only)
router.patch('/:id/toggle-status', restrictTo('admin'), programController.toggleProgramStatus);

module.exports = router;
