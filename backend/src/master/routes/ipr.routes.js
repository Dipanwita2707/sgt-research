const express = require('express');
const router = express.Router();
const iprController = require('../controllers/ipr.controller');
const { protect, restrictTo, requirePermission, requireAnyPermission, checkIprFilePermission } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Applicant routes - available to users with file/edit own permissions
router.get('/my-applications', iprController.getMyIprApplications);
router.get('/contributed', iprController.getContributedIprApplications);  // Get applications where user is a contributor
router.get('/contributed/:id', iprController.getContributedIprApplicationById);  // View single contributed application
// IPR Filing: Faculty/Student can file by default, Staff needs ipr_file_new permission from admin
router.post('/create', checkIprFilePermission, iprController.createIprApplication);
router.post('/:id/submit', iprController.submitIprApplication);
router.post('/:id/resubmit', iprController.resubmitIprApplication);
router.put('/:id', iprController.updateIprApplication);  // Edit own handled in controller
router.delete('/:id', requireAnyPermission('central-department', ['ipr_delete', 'ipr_edit_all']), iprController.deleteIprApplication);

// Admin/DRD routes - require appropriate permissions
router.get('/statistics', requireAnyPermission('central-department', ['ipr_analytics', 'ipr_all_dashboard']), iprController.getIprStatistics);
router.get('/stats', requireAnyPermission('central-department', ['ipr_analytics', 'ipr_all_dashboard']), iprController.getIprStatistics);
router.get('/:id', requireAnyPermission('central-department', ['ipr_all_dashboard', 'ipr_own_dashboard', 'ipr_review', 'ipr_approve']), iprController.getIprApplicationById);
router.get('/', requireAnyPermission('central-department', ['ipr_all_dashboard', 'ipr_own_dashboard', 'ipr_review', 'ipr_approve']), iprController.getAllIprApplications);

module.exports = router;
