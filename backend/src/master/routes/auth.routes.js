const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../../middleware/auth');

// Validation middleware
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be at most 20 characters'),
  body('email').optional().trim().isEmail().withMessage('Invalid email format')
];

// Public routes
router.post('/login', loginValidation, authController.login);

// Protected routes
router.use(protect);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.put('/change-password', changePasswordValidation, authController.changePassword);
router.put('/profile', updateProfileValidation, authController.updateProfile);
router.get('/settings', authController.getSettings);
router.put('/settings', authController.updateSettings);

module.exports = router;
