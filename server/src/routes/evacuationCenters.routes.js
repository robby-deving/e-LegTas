// evacuation.route.js

const express = require('express');
const evacuationController = require('../controllers/evacuationCenters.controller'); 

// Create an Express Router instance
const router = express.Router();

// --- Evacuation Center API Routes ---

// GET all evacuation center entries
// Example: GET /api/v1/evacuation-centers
router.get('/', evacuationController.getAllEvacuationCenters);

router.get('/detailed-map-data', evacuationController.getEvacuationCenterMapData);

// GET a single evacuation center entry by ID
// Example: GET /api/v1/evacuation-centers/123
router.get('/:id', evacuationController.getEvacuationCenterById);

// GET evacuation center with its rooms
// Example: GET /api/v1/evacuation-centers/123/rooms
router.get('/:id/rooms', evacuationController.getEvacuationCenterWithRooms);

// POST a new evacuation center entry
// Example: POST /api/v1/evacuation-centers with JSON body
router.post('/', evacuationController.createEvacuationCenter);

// PUT (Update) an existing evacuation center entry by ID
// Example: PUT /api/v1/evacuation-centers/123 with JSON body
router.put('/:id', evacuationController.updateEvacuationCenter);

// DELETE an evacuation center entry by ID
// Example: DELETE /api/v1/evacuation-centers/123
router.delete('/:id', evacuationController.deleteEvacuationCenter);

// Soft delete an evacuation center
// Example: PUT /api/v1/evacuation-centers/123/soft-delete
router.put('/:id/soft-delete', evacuationController.softDeleteEvacuationCenter);

// Restore a soft-deleted evacuation center
// Example: PUT /api/v1/evacuation-centers/123/restore
router.put('/:id/restore', evacuationController.restoreEvacuationCenter);

// Export the router
module.exports = router;
