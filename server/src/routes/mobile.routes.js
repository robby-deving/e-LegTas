const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const evacuationController = require('../controllers/evacuationCenters.controller'); // Fixed: correct controller name
const { authenticateMobileApp, getRateLimitStatus } = require('../middleware/deviceAuth');
const { validateQuery, validateBody } = require('../middleware/inputValidation');

// Apply API key authentication to all mobile routes
router.use(authenticateMobileApp);

// Mobile app endpoints with API key protection

// Get announcements with pagination
router.get('/announcements',
  validateQuery({
    limit: { validator: 'numeric', required: false, options: { min: 1, max: 100 } },
    offset: { validator: 'numeric', required: false, options: { min: 0 } },
    search: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  notificationController.getAllAnnouncements
);

// Get map data with optional disaster filter
router.get('/map-data',
  validateQuery({
    disaster_id: { validator: 'integer', required: false }
  }),
  evacuationController.getEvacuationCenterMapData
);

// Register device token
router.post('/register',
  validateBody({
    token: { validator: 'string', required: true, options: { minLength: 10, maxLength: 500 } }
  }),
  notificationController.registerDeviceToken
);

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