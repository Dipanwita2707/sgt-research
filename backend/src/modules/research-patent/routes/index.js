const express = require('express');
const router = express.Router();
const researchController = require('../controllers/research.controller');
const { protect, checkDepartmentPermission } = require('../../../middleware/auth');

// All routes require authentication
router.use(protect);

// Research paper routes
router.get('/papers', researchController.getAllPapers);
router.post('/papers', researchController.createPaper);
router.get('/papers/:id', researchController.getPaper);
router.put('/papers/:id', researchController.updatePaper);
router.delete('/papers/:id', researchController.deletePaper);

// Paper review (faculty/admin only)
router.post('/papers/:id/review', researchController.reviewPaper);

// Patent routes
router.get('/patents', researchController.getAllPatents);
router.post('/patents', researchController.createPatent);
router.get('/patents/:id', researchController.getPatent);
router.put('/patents/:id', researchController.updatePatent);
router.delete('/patents/:id', researchController.deletePatent);

// Patent status update
router.post('/patents/:id/status', researchController.updatePatentStatus);

module.exports = router;
