const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { protect, requirePermission, requireAnyPermission } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Finance Team routes - require finance permissions
router.get('/pending', requireAnyPermission('research-patent', ['finance_review', 'finance_approve', 'finance_manage']), financeController.getPendingFinanceReviews);
router.get('/statistics', requireAnyPermission('research-patent', ['finance_review', 'finance_approve', 'finance_manage']), financeController.getFinanceStatistics);
router.post('/approve/:id', requireAnyPermission('research-patent', ['finance_approve', 'finance_manage']), financeController.approveFinanceApplication);
router.post('/reject/:id', requireAnyPermission('research-patent', ['finance_approve', 'finance_manage']), financeController.rejectFinanceApplication);
router.post('/request-audit/:id', requirePermission('research-patent', 'finance_review'), financeController.requestAdditionalAudit);
router.post('/process-incentive/:id', requireAnyPermission('research-patent', ['finance_approve', 'finance_manage']), financeController.processFinanceIncentive);
router.get('/applicant-history/:applicantId', requireAnyPermission('research-patent', ['finance_review', 'finance_approve', 'finance_manage']), financeController.getApplicantIncentiveHistory);

module.exports = router;
