/**
 * Research Contribution Routes
 * Handles all routes for research paper, book, conference, and grant submissions
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const researchContributionController = require('../controllers/researchContribution.controller');
const researchReviewController = require('../controllers/researchReview.controller');
const { protect, requirePermission, checkResearchFilePermission } = require('../../middleware/auth');
const prisma = require('../../config/database');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/research');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-compressed',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper middleware: Allow either research_review OR research_approve permission
const requireResearchAccess = async (req, res, next) => {
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
    const hasReviewPerm = permissions.research_review === true || 
                          permissions.book_review === true ||
                          permissions.conference_review === true ||
                          permissions.grant_review === true;
    const hasApprovePerm = permissions.research_approve === true ||
                           permissions.book_approve === true ||
                           permissions.conference_approve === true ||
                           permissions.grant_approve === true;

    console.log(`User ${userId} DRD permissions:`, { hasReviewPerm, hasApprovePerm, permissions });

    if (!hasReviewPerm && !hasApprovePerm) {
      console.log(`Access denied for user ${userId} - No research permissions`);
      return res.status(403).json({
        success: false,
        message: 'Access denied - review or approve permission required'
      });
    }

    next();
  } catch (error) {
    console.error('Research access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify permissions',
      error: error.message
    });
  }
};

// ============================================
// Research Contribution Routes (Filing)
// ============================================

// Get my research contributions
router.get(
  '/my-contributions',
  protect,
  researchContributionController.getMyResearchContributions
);

// Get contributions where I am a co-author
router.get(
  '/contributed',
  protect,
  researchContributionController.getContributedResearch
);

// Lookup user by registration number
router.get(
  '/lookup/:registrationNumber',
  protect,
  researchContributionController.lookupByRegistration
);

// Get incentive policies
router.get(
  '/incentive-policies',
  protect,
  researchContributionController.getIncentivePolicies
);

// Create new research contribution
router.post(
  '/',
  protect,
  checkResearchFilePermission,
  researchContributionController.createResearchContribution
);

// Get single research contribution
router.get(
  '/:id',
  protect,
  researchContributionController.getResearchContributionById
);

// Update research contribution (draft or changes_required)
router.put(
  '/:id',
  protect,
  researchContributionController.updateResearchContribution
);

// Submit research contribution
router.post(
  '/:id/submit',
  protect,
  researchContributionController.submitResearchContribution
);

// ============================================
// Mentor Routes (for student submissions)
// ============================================

// Get pending mentor approvals
router.get(
  '/mentor/pending',
  protect,
  researchContributionController.getPendingMentorApprovals
);

// Mentor approve contribution
router.post(
  '/:id/mentor-approve',
  protect,
  researchContributionController.mentorApproveContribution
);

// Mentor reject contribution
router.post(
  '/:id/mentor-reject',
  protect,
  researchContributionController.mentorRejectContribution
);

// ============================================

// Resubmit after changes
router.post(
  '/:id/resubmit',
  protect,
  researchContributionController.resubmitResearchContribution
);

// Delete research contribution (draft only)
router.delete(
  '/:id',
  protect,
  researchContributionController.deleteResearchContribution
);

// ============================================
// Document Upload Routes
// ============================================

// Upload documents for research contribution
router.post(
  '/:id/documents',
  protect,
  upload.fields([
    { name: 'researchDocument', maxCount: 1 },
    { name: 'supportingDocuments', maxCount: 10 }
  ]),
  researchContributionController.uploadDocuments
);

// ============================================
// Author Management Routes
// ============================================

// Add author to contribution
router.post(
  '/:id/authors',
  protect,
  researchContributionController.addAuthor
);

// Update author
router.put(
  '/:id/authors/:authorId',
  protect,
  researchContributionController.updateAuthor
);

// Remove author
router.delete(
  '/:id/authors/:authorId',
  protect,
  researchContributionController.removeAuthor
);

// ============================================
// DRD Review Routes
// ============================================

// Get pending reviews (DRD - reviewers and approvers)
router.get(
  '/review/pending',
  protect,
  requireResearchAccess,
  researchReviewController.getPendingReviews
);

// Get review statistics (DRD - reviewers and approvers)
router.get(
  '/review/statistics',
  protect,
  requireResearchAccess,
  researchReviewController.getReviewStatistics
);

// Get schools for filtering (DRD - reviewers and approvers)
router.get(
  '/review/schools',
  protect,
  requireResearchAccess,
  researchReviewController.getSchoolsForFilter
);

// Start review
router.post(
  '/:id/review/start',
  protect,
  requirePermission('central-department', 'research_review'),
  researchReviewController.startReview
);

// Request changes
router.post(
  '/:id/review/request-changes',
  protect,
  requirePermission('central-department', 'research_review'),
  researchReviewController.requestChanges
);

// Recommend for approval (Reviewer with research_review permission)
router.post(
  '/:id/review/recommend',
  protect,
  requirePermission('central-department', 'research_review'),
  researchReviewController.recommendForApproval
);

// Approve contribution (DRD Head)
router.post(
  '/:id/review/approve',
  protect,
  requirePermission('central-department', 'research_approve'),
  researchReviewController.approveContribution
);

// Reject contribution
router.post(
  '/:id/review/reject',
  protect,
  requirePermission('central-department', 'research_approve'),
  researchReviewController.rejectContribution
);

// Mark as completed
router.post(
  '/:id/review/complete',
  protect,
  requirePermission('central-department', 'research_approve'),
  researchReviewController.markCompleted
);

// ============================================
// Edit Suggestion Routes
// ============================================

// Respond to edit suggestion (applicant)
router.post(
  '/suggestions/:suggestionId/respond',
  protect,
  researchReviewController.respondToSuggestion
);

module.exports = router;
