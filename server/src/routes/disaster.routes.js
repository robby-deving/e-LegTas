// disaster.route.js

const express = require('express');
const disasterController = require('../controllers/disaster.controller'); // Adjust path based on your folder structure

// Create an Express Router instance
const router = express.Router();

// --- Disaster API Routes ---
// GET disaster types
// Example: GET /api/v1/disasters/types
router.get('/types', disasterController.getAllDisasterTypes);
// GET all disaster entries
// Example: GET /api/v1/disasters
router.get('/', disasterController.getAllDisasters);

// GET a single disaster entry by ID
// Example: GET /api/v1/disasters/123
router.get('/:id', disasterController.getDisasterById);

// POST a new disaster entry
// Example: POST /api/v1/disasters with JSON body
router.post('/', disasterController.createDisaster);

// PUT (Update) an existing disaster entry by ID
// Example: PUT /api/v1/disasters/123 with JSON body
router.put('/:id', disasterController.updateDisaster);

// DELETE a disaster entry by ID
// Example: DELETE /api/v1/disasters/123
router.delete('/:id', disasterController.deleteDisaster);



// Export the router
module.exports = router;
