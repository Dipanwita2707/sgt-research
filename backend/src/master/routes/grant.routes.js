/**
 * Grant Application Routes
 * Routes for managing research grant applications
 */

const express = require('express');
const router = express.Router();
const grantController = require('../controllers/grant.controller');
const { protect, requirePermission } = require('../../middleware/auth');
const prisma = require('../../config/database');

// Helper middleware: Allow either grant_review OR grant_approve permission (or fallback to research permissions)
const requireGrantAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if user has DRD permissions
    const userDrdPermission = await prisma.centralDepartmentPermission.findFirst({
      where: {
        userId,
        isActive: true,
        centralDept: {
          OR: [
            { departmentCode: 'DRD' },
            { shortName: 'DRD' }
          ]
        }
      },
      include: {
        centralDept: true
      }
    });

    if (!userDrdPermission) {
      console.log(`Access denied for user ${userId} - No DRD permissions found`);
      return res.status(403).json({
        success: false,
        message: 'Access denied - No DRD permissions'
      });
    }

    const permissions = userDrdPermission.permissions || {};
    // Check for grant-specific permissions OR research permissions (fallback)
    const hasReviewPerm = permissions.grant_review === true || permissions.research_review === true;
    const hasApprovePerm = permissions.grant_approve === true || permissions.research_approve === true;

    console.log(`User ${userId} DRD grant permissions:`, { hasReviewPerm, hasApprovePerm, permissions });

    if (!hasReviewPerm && !hasApprovePerm) {
      console.log(`Access denied for user ${userId} - No grant review/approve permissions`);
      return res.status(403).json({
        success: false,
        message: 'Access denied - grant_review or grant_approve permission required'
      });
    }

    next();
  } catch (error) {
    console.error('Grant access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify permissions',
      error: error.message
    });
  }
};

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/grants
 * @desc    Create a new grant application
 * @access  Private
 */
router.post('/', grantController.createGrantApplication);

/**
 * @route   GET /api/grants/my-grants
 * @desc    Get all grant applications for current user
 * @access  Private
 */
router.get('/my-grants', grantController.getMyGrantApplications);

// ============================================
// DRD Review Routes
// ============================================

/**
 * @route   GET /api/grants/review/pending
 * @desc    Get pending grant applications for review (DRD)
 * @access  Private (DRD with grant_review or grant_approve)
 */
router.get('/review/pending', requireGrantAccess, grantController.getPendingGrantReviews);

/**
 * @route   POST /api/grants/:id/review/start
 * @desc    Start reviewing a grant application
 * @access  Private (DRD with grant_review or research_review)
 */
router.post(
  '/:id/review/start',
  requirePermission('central-department', 'grant_review', 'research_review'),
  grantController.startReview
);

/**
 * @route   POST /api/grants/:id/review/request-changes
 * @desc    Request changes on a grant application
 * @access  Private (DRD with grant_review or research_review)
 */
router.post(
  '/:id/review/request-changes',
  requirePermission('central-department', 'grant_review', 'research_review'),
  grantController.requestChanges
);

/**
 * @route   POST /api/grants/:id/review/recommend
 * @desc    Recommend grant application for approval
 * @access  Private (DRD with grant_review or research_review)
 */
router.post(
  '/:id/review/recommend',
  requirePermission('central-department', 'grant_review', 'research_review'),
  grantController.recommendForApproval
);

/**
 * @route   POST /api/grants/:id/review/approve
 * @desc    Approve grant application (DRD Head)
 * @access  Private (DRD with grant_approve or research_approve)
 */
router.post(
  '/:id/review/approve',
  requirePermission('central-department', 'grant_approve', 'research_approve'),
  grantController.approveGrant
);

/**
 * @route   POST /api/grants/:id/review/reject
 * @desc    Reject grant application
 * @access  Private (DRD with grant_approve or research_approve)
 */
router.post(
  '/:id/review/reject',
  requirePermission('central-department', 'grant_approve', 'research_approve'),
  grantController.rejectGrant
);

/**
 * @route   POST /api/grants/:id/review/complete
 * @desc    Mark grant application as completed
 * @access  Private (DRD with grant_approve or research_approve)
 */
router.post(
  '/:id/review/complete',
  requirePermission('central-department', 'grant_approve', 'research_approve'),
  grantController.markCompleted
);

/**
 * @route   GET /api/grants/:id
 * @desc    Get single grant application by ID
 * @access  Private
 */
router.get('/:id', grantController.getGrantApplicationById);

/**
 * @route   PUT /api/grants/:id
 * @desc    Update grant application
 * @access  Private
 */
router.put('/:id', grantController.updateGrantApplication);

/**
 * @route   POST /api/grants/:id/submit
 * @desc    Submit grant application for review
 * @access  Private
 */
router.post('/:id/submit', grantController.submitGrantApplication);

/**
 * @route   DELETE /api/grants/:id
 * @desc    Delete grant application (drafts only)
 * @access  Private
 */
router.delete('/:id', grantController.deleteGrantApplication);

module.exports = router;
