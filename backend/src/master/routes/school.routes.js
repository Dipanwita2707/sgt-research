const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/school.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// GET all schools
router.get('/', schoolController.getAllSchools);

// GET school by ID
router.get('/:id', schoolController.getSchoolById);

// POST create new school
router.post('/', schoolController.createSchool);

// PUT update school
router.put('/:id', schoolController.updateSchool);

// DELETE school
router.delete('/:id', schoolController.deleteSchool);

// PATCH toggle school status
router.patch('/:id/toggle-status', schoolController.toggleSchoolStatus);

module.exports = router;
