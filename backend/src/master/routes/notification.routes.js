const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require('../controllers/notification.controller');

// All routes require authentication
router.use(protect);

// Get all notifications for current user
router.get('/', getMyNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// Mark specific notification as read
router.patch('/:id/read', markAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;
