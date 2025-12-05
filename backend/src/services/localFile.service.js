const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const IPR_UPLOADS_DIR = path.join(UPLOADS_DIR, 'ipr');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(IPR_UPLOADS_DIR)) {
  fs.mkdirSync(IPR_UPLOADS_DIR, { recursive: true });
}

/**
 * Generate unique filename for local storage
 * @param {string} folder - Folder name (e.g., 'ipr', 'research-papers')
 * @param {string} userId - User ID
 * @param {string} originalName - Original filename
 * @returns {string} - Local file path
 */
const generateLocalFileName = (folder, userId, originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(6).toString('hex');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${folder}/${userId}/${timestamp}-${randomString}-${baseName}${ext}`;
};

/**
 * Configure multer for file uploads
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.folder || 'documents';
    const userId = req.user.id;
    const userDir = path.join(UPLOADS_DIR, folder, userId);
    
    // Create user-specific directory if it doesn't exist
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    
    cb(null, `${timestamp}-${randomString}-${baseName}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, and images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Controller: Upload file locally
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const folder = req.body.folder || 'documents';
    const userId = req.user.id;
    const relativePath = `${folder}/${userId}/${req.file.filename}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message,
    });
  }
};

/**
 * Controller: Download file
 */
const downloadFile = async (req, res) => {
  try {
    const { filePath } = req.params;
    const fullPath = path.join(UPLOADS_DIR, filePath);

    // Security check: ensure the file is within the uploads directory
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(UPLOADS_DIR);
    
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Send file
    res.sendFile(fullPath);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message,
    });
  }
};

/**
 * Controller: Delete file
 */
const deleteFile = async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required',
      });
    }

    const fullPath = path.join(UPLOADS_DIR, filePath);

    // Security check: ensure the file is within the uploads directory
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(UPLOADS_DIR);
    
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Delete file
    fs.unlinkSync(fullPath);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
};

/**
 * Get file info
 */
const getFileInfo = async (req, res) => {
  try {
    const { filePath } = req.params;
    const fullPath = path.join(UPLOADS_DIR, filePath);

    // Security check
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(UPLOADS_DIR);
    
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const stats = fs.statSync(fullPath);
    const fileName = path.basename(fullPath);

    res.json({
      success: true,
      data: {
        fileName,
        filePath,
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file info',
      error: error.message,
    });
  }
};

module.exports = {
  upload,
  uploadFile,
  downloadFile,
  deleteFile,
  getFileInfo,
  generateLocalFileName,
};