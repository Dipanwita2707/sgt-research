const express = require('express');
const router = express.Router();
const localFileService = require('../../services/localFile.service');
const { protect } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Upload file directly to local storage
router.post('/upload', localFileService.upload.single('file'), localFileService.uploadFile);

// Upload prototype ZIP file (up to 50MB) for IPR Complete Filing
router.post('/upload-prototype', localFileService.uploadPrototype.single('file'), localFileService.uploadPrototypeFile);

// Download file from local storage
router.get('/download/*', localFileService.downloadFile);

// Get file info
router.get('/info/*', localFileService.getFileInfo);

// Delete file
router.delete('/file', localFileService.deleteFile);

module.exports = router;
