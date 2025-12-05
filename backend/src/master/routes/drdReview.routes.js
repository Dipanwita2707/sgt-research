const express = require('express');
const router = express.Router();
const drdReviewController = require('../controllers/drdReview.controller');
const { protect, requirePermission, requireAnyPermission } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// DRD Team Member routes - Review IPR Applications permission
router.get('/pending', requireAnyPermission('central-department', ['ipr_review', 'ipr_approve']), drdReviewController.getPendingDrdReviews);
router.get('/statistics', requireAnyPermission('central-department', ['ipr_review', 'ipr_approve']), drdReviewController.getDrdReviewStatistics);
router.post('/assign/:id', requirePermission('central-department', 'ipr_approve'), drdReviewController.assignDrdReviewer);
router.post('/review/:id', requirePermission('central-department', 'ipr_review'), drdReviewController.submitDrdReview);
router.post('/accept-edits/:id', requirePermission('central-department', 'ipr_review'), drdReviewController.acceptEditsAndResubmit);

// Request changes - Review permission
router.post('/request-changes/:id', requirePermission('central-department', 'ipr_review'), drdReviewController.requestChanges);

// Recommend to Head - Review permission (recommend is part of review)
router.post('/recommend/:id', requirePermission('central-department', 'ipr_review'), drdReviewController.recommendToHead);

// DRD Head Approval routes - Final Approve permission
router.post('/head-approve/:id', requirePermission('central-department', 'ipr_approve'), drdReviewController.headApproveAndSubmitToGovt);
router.post('/approve/:id', requirePermission('central-department', 'ipr_approve'), drdReviewController.finalApproval);
router.post('/reject/:id', requirePermission('central-department', 'ipr_approve'), drdReviewController.finalRejection);

// Government Filing & Publication - Only Reviewers (ipr_review), NOT DRD Head
// DRD Head can view but not fill these - this is the reviewer's task after head approval
router.post('/govt-application/:id', requirePermission('central-department', 'ipr_review'), drdReviewController.addGovtApplicationId);
router.post('/publication/:id', requirePermission('central-department', 'ipr_review'), drdReviewController.addPublicationId);

// System Override - Approve permission (DRD Head level)
router.post('/system-override/:id', requirePermission('central-department', 'ipr_approve'), drdReviewController.systemOverride);

module.exports = router;
