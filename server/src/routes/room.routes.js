// room.route.js

const express = require('express');
const roomController = require('../controllers/room.controller'); // Adjust path based on your folder structure
const { validateParams, validateBody } = require('../middleware/inputValidation');

// Create an Express Router instance
const router = express.Router();

// --- Evacuation Room API Routes ---

// GET all evacuation room entries
// Example: GET /api/v1/rooms
router.get('/', roomController.getAllRooms);

// NEW: Get all evacuation room entries for a specific evacuation center
// Example: GET /api/v1/rooms/by-center/456
// NOTE: This MUST come before /:id route to avoid route conflicts
router.get('/by-center/:evacuationCenterId', 
  validateParams({
    evacuationCenterId: { validator: 'integer' }
  }),
  roomController.getRoomsByEvacuationCenterId
);

// GET a single evacuation room entry by ID
// Example: GET /api/v1/rooms/123
router.get('/:id', 
  validateParams({
    id: { validator: 'integer' }
  }),
  roomController.getRoomById
);

// POST a new evacuation room entry
// Example: POST /api/v1/rooms with JSON body
router.post('/', 
  validateBody({
    evacuation_center_id: { validator: 'integer', required: true, options: { min: 1 } },
    room_name: { validator: 'string', required: true, options: { minLength: 1, maxLength: 255 } },
    individual_room_capacity: { validator: 'integer', required: true, options: { min: 0 } },
    room_type: { validator: 'string', required: true, options: { minLength: 1, maxLength: 100 } }
  }),
  roomController.createRoom
);

// PUT (Update) an existing evacuation room entry by ID
// Example: PUT /api/v1/rooms/123 with JSON body
router.put('/:id', 
  validateParams({
    id: { validator: 'integer' }
  }),
  validateBody({
    evacuation_center_id: { validator: 'integer', required: false, options: { min: 1 } },
    room_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 255 } },
    individual_room_capacity: { validator: 'integer', required: false, options: { min: 0 } },
    room_type: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  roomController.updateRoom
);

// Soft-delete an evacuation room entry
// Example: PATCH /api/v1/rooms/123/soft-delete
router.patch('/:id/soft-delete', 
  validateParams({
    id: { validator: 'integer' }
  }),
  roomController.softDeleteRoom
);

// DELETE an evacuation room entry by ID (Hard Delete - use with caution!)
// Example: DELETE /api/v1/rooms/123
router.delete('/:id', 
  validateParams({
    id: { validator: 'integer' }
  }),
  roomController.deleteRoom
);

// Export the router
module.exports = router;
