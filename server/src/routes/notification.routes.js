const express = require('express');
const notificationController = require('../controllers/notification.controller'); // Correct controller
const { requirePermission } = require('../middleware');
const { validateParams, validateQuery, validateBody } = require('../middleware/inputValidation');

const router = express.Router();

// Device token registration can remain open (or protect if desired)
router.post('/register', 
  validateBody({
    token: { validator: 'string', required: true, options: { minLength: 10, maxLength: 500 } }
  }),
  notificationController.registerDeviceToken
);

// Announcements endpoints with RBAC enforcement
router.post(
  '/send-announcement',
  requirePermission('post_announcement'),
  validateBody({
    title: { validator: 'string', required: true, options: { minLength: 1, maxLength: 255 } },
    content: { validator: 'string', required: true, options: { minLength: 1, maxLength: 5000 } },
    created_by: { validator: 'integer', required: false, options: { min: 1 } }
  }),
  notificationController.sendAnnouncementNotification
);

router.get(
  '/',
  requirePermission('view_announcement_page'),
  validateQuery({
    limit: { validator: 'numeric', required: false, options: { min: 1, max: 100 } },
    offset: { validator: 'numeric', required: false, options: { min: 0 } },
    search: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  notificationController.getAllAnnouncements
);

router.delete(
  '/:id',
  requirePermission('delete_announcement'),
  validateParams({
    id: { validator: 'integer' }
  }),
  notificationController.deleteAnnouncement
); 

module.exports = router;
