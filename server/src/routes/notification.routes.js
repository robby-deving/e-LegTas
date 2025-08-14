const express = require('express');
const notificationController = require('../controllers/notification.controller'); // Correct controller

const router = express.Router();

router.post('/register', notificationController.registerDeviceToken);
router.post('/send-announcement', notificationController.sendAnnouncementNotification);
router.get('/', notificationController.getAllAnnouncements);
router.delete('/:id', notificationController.deleteAnnouncement); 

module.exports = router;
