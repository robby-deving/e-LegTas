const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const evacuationController = require('../controllers/evacuationCenters.controller'); // Fixed: correct controller name
const { authenticateMobileApp, getRateLimitStatus } = require('../middleware/deviceAuth');

// Apply API key authentication to all mobile routes
router.use(authenticateMobileApp);

// Mobile app endpoints with API key protection

router.get('/announcements', notificationController.getAllAnnouncements);
router.get('/map-data', evacuationController.getEvacuationCenterMapData);
router.post('/register', notificationController.registerDeviceToken);

// Rate limit status endpoint (useful for debugging)
router.get('/status', (req, res) => {
  const rateLimitStatus = getRateLimitStatus();
  res.json({
    message: 'Mobile API is operational',
    rateLimit: rateLimitStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;