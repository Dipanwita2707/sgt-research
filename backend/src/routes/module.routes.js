const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/module.controller');
const { protect } = require('../middleware/auth');

// All module routes require authentication
router.use(protect);

router.get('/', moduleController.getAllModules);
router.get('/:slug', moduleController.getModule);
router.get('/:slug/permissions', moduleController.getModulePermissions);

module.exports = router;
