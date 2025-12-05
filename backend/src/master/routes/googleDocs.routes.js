const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const googleDocsController = require('../controllers/googleDocsController');

// Protect all routes
router.use(protect);

// Get document with changes
router.get('/document/:iprApplicationId/:fieldName', googleDocsController.getDocument);

// Submit a change
router.post('/submit-change', googleDocsController.submitChange);

// Accept a change (for applicants)
router.post('/accept-change/:changeId', googleDocsController.acceptChange);

// Reject a change (for applicants)
router.post('/reject-change/:changeId', googleDocsController.rejectChange);

// Get pending changes for an application
router.get('/pending-changes/:iprApplicationId', googleDocsController.getPendingChanges);

// Auto-save draft
router.post('/save-draft', googleDocsController.saveDraft);

// Get document status
router.get('/status/:iprApplicationId', googleDocsController.getDocumentStatus);

module.exports = router;