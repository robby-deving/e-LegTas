const express = require('express');
const notificationController = require('../controllers/notification.controller'); // Correct controller
const { requirePermission } = require('../middleware');

const router = express.Router();

// Device token registration can remain open (or protect if desired)
router.post('/register', notificationController.registerDeviceToken);

// Announcements endpoints with RBAC enforcement
router.post(
  '/send-announcement',
  requirePermission('post_announcement'),
  notificationController.sendAnnouncementNotification
);

router.get(
  '/',
  requirePermission('view_announcement_page'),
  notificationController.getAllAnnouncements
);

router.delete(
  '/:id',
  requirePermission('delete_announcement'),
  notificationController.deleteAnnouncement
); 

module.exports = router;
