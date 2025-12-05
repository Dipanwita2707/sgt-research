/**
 * @deprecated These routes are DEPRECATED.
 * Dean approval layer has been removed from the IPR workflow.
 * The workflow is now: Applicant → DRD Member → DRD Head → Govt Filing → Finance
 * 
 * Use drdReview.routes.js for DRD Member and DRD Head functions instead.
 * These routes are kept for backward compatibility but will return 410 Gone status.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Deprecated message handler
const deprecatedHandler = (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Dean approval has been removed from the IPR workflow. Use DRD Review endpoints instead.',
    deprecated: true,
    alternativeEndpoints: {
      pending: '/api/v1/master/drd-review/pending',
      approve: '/api/v1/master/drd-review/head/approve/:id',
      reject: '/api/v1/master/drd-review/head/reject/:id'
    }
  });
};

// All legacy dean routes return deprecation notice
router.get('/pending', deprecatedHandler);
router.get('/statistics', deprecatedHandler);
router.post('/approve/:id', deprecatedHandler);
router.post('/reject/:id', deprecatedHandler);
router.post('/decision/:id', deprecatedHandler);

module.exports = router;
