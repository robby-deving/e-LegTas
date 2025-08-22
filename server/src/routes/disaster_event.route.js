// disaster_event.route.js

const express = require('express');
const { 
  getDisasterEventDetailsByDisasterId,
  getDisasterEventById,
  createDisasterEvent
} = require('../controllers/disaster_event.controller');
const { authenticateUser, requirePermission } = require('../middleware');

const router = express.Router();

// --- Disaster Evacuation Event API Routes ---

// GET detailed disaster evacuation event data filtered by disaster ID
// Example: GET /api/v1/disaster-events/by-disaster/123/details
router.get('/by-disaster/:disasterId/details', 
  authenticateUser, 
  getDisasterEventDetailsByDisasterId
);

// GET a single detailed disaster evacuation event by its ID
// Example: GET /api/v1/disaster-events/456
router.get('/:id', 
  authenticateUser, 
  getDisasterEventById
);

// POST a new disaster evacuation event entry
// Example: POST /api/v1/disaster-events with JSON body
router.post('/', 
  authenticateUser, 
  createDisasterEvent
);

// Export the router
module.exports = router;