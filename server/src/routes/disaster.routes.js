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
// @desc Get all disaster types
// @route GET /api/v1/disasters/types
// @access Private (requires view_disaster permission)
router.get('/types', authenticateUser, requirePermission('view_disaster'), getAllDisasterTypes);

// GET all disaster entries
// Example: GET /api/v1/disasters
// @desc Get all disasters
// @route GET /api/v1/disasters
// @access Private (requires view_disaster permission)
router.get('/', authenticateUser, requirePermission('view_disaster'), getAllDisasters);

// GET a single disaster entry by ID
// Example: GET /api/v1/disasters/123
// @desc Get disaster by ID
// @route GET /api/v1/disasters/:id
// @access Private (requires view_disaster permission)
router.get('/:id', 
  authenticateUser, 
  requirePermission('view_disaster'),
  getDisasterById
);

// POST a new disaster entry
// Example: POST /api/v1/disasters with JSON body
// @desc Create a new disaster
// @route POST /api/v1/disasters
// @access Private (requires create_disaster permission)
router.post('/', 
  authenticateUser, 
  requirePermission('create_disaster'), 
  createDisaster
);

// PUT (Update) an existing disaster entry by ID
// Example: PUT /api/v1/disasters/123 with JSON body
// @desc Update a disaster
// @route PUT /api/v1/disasters/:id
// @access Private (requires update_disaster permission)
router.put('/:id', 
  authenticateUser, 
  requirePermission('update_disaster'), 
  updateDisaster
);

// DELETE a disaster entry by ID
// Example: DELETE /api/v1/disasters/123
// @desc Delete a disaster
// @route DELETE /api/v1/disasters/:id
// @access Private (requires delete_disaster permission)
router.delete('/:id', 
  authenticateUser, 
  requirePermission('delete_disaster'), 
  deleteDisaster
);

// Export the router
module.exports = router;
