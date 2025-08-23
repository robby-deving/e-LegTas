// disaster.routes.js

const express = require('express');
const { 
  getAllDisasterTypes,
  getAllDisasters,
  getDisasterById,
  createDisaster,
  updateDisaster,
  deleteDisaster
} = require('../controllers/disaster.controller');
const { authenticateUser, requirePermission } = require('../middleware');

// Create an Express Router instance
const router = express.Router();

// --- Disaster API Routes ---
// GET disaster types
// Example: GET /api/v1/disasters/types
router.get('/types', getAllDisasterTypes);

// GET all disaster entries
// Example: GET /api/v1/disasters
router.get('/', getAllDisasters);

// GET a single disaster entry by ID
// Example: GET /api/v1/disasters/123
router.get('/:id', 
  authenticateUser, 
  getDisasterById
);

// POST a new disaster entry
// Example: POST /api/v1/disasters with JSON body
router.post('/', 
  authenticateUser, 
  requirePermission('create_disaster'), 
  createDisaster
);

// PUT (Update) an existing disaster entry by ID
// Example: PUT /api/v1/disasters/123 with JSON body
router.put('/:id', 
  authenticateUser, 
  requirePermission('update_disaster'), 
  updateDisaster
);

// DELETE a disaster entry by ID
// Example: DELETE /api/v1/disasters/123
router.delete('/:id', 
  authenticateUser, 
  requirePermission('delete_disaster'), 
  deleteDisaster
);



// Export the router
module.exports = router;
