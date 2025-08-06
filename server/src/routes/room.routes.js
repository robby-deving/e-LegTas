// room.route.js

const express = require('express');
const roomController = require('../controllers/room.controller'); // Adjust path based on your folder structure

// Create an Express Router instance
const router = express.Router();

// --- Evacuation Room API Routes ---

// GET all evacuation room entries
// Example: GET /api/v1/rooms
router.get('/', roomController.getAllRooms);

// GET a single evacuation room entry by ID
// Example: GET /api/v1/rooms/123
router.get('/:id', roomController.getRoomById);

// POST a new evacuation room entry
// Example: POST /api/v1/rooms with JSON body
router.post('/', roomController.createRoom);

// PUT (Update) an existing evacuation room entry by ID
// Example: PUT /api/v1/rooms/123 with JSON body
router.put('/:id', roomController.updateRoom);

// DELETE an evacuation room entry by ID (Hard Delete - use with caution!)
// Example: DELETE /api/v1/rooms/123
router.delete('/:id', roomController.deleteRoom);

// Soft-delete an evacuation room entry
// Example: PATCH /api/v1/rooms/123/soft-delete
router.patch('/:id/soft-delete', roomController.softDeleteRoom);

// NEW: Get all evacuation room entries for a specific evacuation center
// Example: GET /api/v1/rooms/by-center/456
router.get('/by-center/:evacuationCenterId', roomController.getRoomsByEvacuationCenterId);


// Export the router
module.exports = router;
