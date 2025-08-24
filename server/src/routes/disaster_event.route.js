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
// @desc Get disaster evacuation event details by disaster ID
// @route GET /api/v1/disaster-events/by-disaster/:disasterId/details
// @access Private (requires view_disaster permission)
router.get('/by-disaster/:disasterId/details', 
  authenticateUser, 
  requirePermission('view_disaster'),
  getDisasterEventDetailsByDisasterId
);

// GET a single detailed disaster evacuation event by its ID
// Example: GET /api/v1/disaster-events/456
// @desc Get disaster evacuation event by ID
// @route GET /api/v1/disaster-events/:id
// @access Private (requires view_disaster permission)
router.get('/:id', 
  authenticateUser, 
  requirePermission('view_disaster'),
  getDisasterEventById
);

// POST a new disaster evacuation event entry
// Example: POST /api/v1/disaster-events with JSON body
// @desc Create a new disaster evacuation event
// @route POST /api/v1/disaster-events
// @access Private (requires create_disaster permission)
router.post('/', 
  authenticateUser, 
  requirePermission('create_disaster'),
  createDisasterEvent
);

// Export the router
module.exports = router;