// disaster_event.route.js

const express = require('express');
const disasterEventController = require('../controllers/disaster_event.controller'); // Adjust path

// Placeholder for your security middleware (e.g., const authenticateUser = require('../middleware/authMiddleware');)

const router = express.Router();

// --- Disaster Evacuation Event API Routes ---

// GET detailed disaster evacuation event data filtered by disaster ID
// Example: GET /api/v1/disaster-events/by-disaster/123/details
router.get('/by-disaster/:disasterId/details', disasterEventController.getDisasterEventDetailsByDisasterId);

// GET a single detailed disaster evacuation event by its ID
// Example: GET /api/v1/disaster-events/456
router.get('/:id', disasterEventController.getDisasterEventById);

// POST a new disaster evacuation event entry
// Example: POST /api/v1/disaster-events with JSON body
router.post('/', /* authenticateUser, */ disasterEventController.createDisasterEvent);

// Export the router
module.exports = router;