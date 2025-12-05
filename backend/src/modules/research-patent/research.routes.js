const express = require('express');
const router = express.Router();
const researchController = require('../controllers/research.controller');
const { protect, checkAnyPermission } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Research paper routes
router.get(
  '/papers',
  checkAnyPermission('research.view', 'research.submit', 'research.review'),
  researchController.getAllPapers
);

router.post(
  '/papers',
  checkAnyPermission('research.submit'),
  researchController.createPaper
);

router.get(
  '/papers/:id',
  checkAnyPermission('research.view', 'research.submit', 'research.review'),
  researchController.getPaper
);

router.put(
  '/papers/:id',
  checkAnyPermission('research.submit'),
  researchController.updatePaper
);

router.delete(
  '/papers/:id',
  checkAnyPermission('research.submit', 'research.review'),
  researchController.deletePaper
);

// Paper review (staff only)
router.post(
  '/papers/:id/review',
  checkAnyPermission('research.review'),
  researchController.reviewPaper
);

// Patent routes
router.get(
  '/patents',
  checkAnyPermission('patent.view', 'patent.submit', 'patent.manage'),
  researchController.getAllPatents
);

router.post(
  '/patents',
  checkAnyPermission('patent.submit'),
  researchController.createPatent
);

router.get(
  '/patents/:id',
  checkAnyPermission('patent.view', 'patent.submit', 'patent.manage'),
  researchController.getPatent
);

router.put(
  '/patents/:id',
  checkAnyPermission('patent.submit', 'patent.manage'),
  researchController.updatePatent
);

router.delete(
  '/patents/:id',
  checkAnyPermission('patent.manage'),
  researchController.deletePatent
);

// Patent status update (manage only)
router.post(
  '/patents/:id/status',
  checkAnyPermission('patent.manage'),
  researchController.updatePatentStatus
);

module.exports = router;
