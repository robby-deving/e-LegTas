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
const { validateParams, validateQuery, validateBody } = require('../middleware/inputValidation');

// Create an Express Router instance
const router = express.Router();

// --- Disaster API Routes ---
// GET disaster types
// Example: GET /api/v1/disasters/types
// @desc Get all disaster types
// @route GET /api/v1/disasters/types
// @access Private (requires view_disaster permission)
router.get('/types', 
  authenticateUser, 
  requirePermission('view_disaster'), 
  getAllDisasterTypes
);

// GET all disaster entries
// Example: GET /api/v1/disasters
// @desc Get all disasters
// @route GET /api/v1/disasters
// @access Private (requires view_disaster permission)
router.get('/', 
  authenticateUser, 
  requirePermission('view_disaster'),
  validateQuery({
    month: { validator: 'integer', required: false, options: { min: 0, max: 11 } },
    year: { validator: 'integer', required: false, options: { min: 1900, max: 2100 } }
  }),
  getAllDisasters
);

// GET a single disaster entry by ID
// Example: GET /api/v1/disasters/123
// @desc Get disaster by ID
// @route GET /api/v1/disasters/:id
// @access Private (requires view_disaster permission)
router.get('/:id', 
  authenticateUser, 
  requirePermission('view_disaster'),
  validateParams({
    id: { validator: 'integer' }
  }),
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
  validateBody({
    disaster_name: { validator: 'string', required: true, options: { minLength: 1, maxLength: 200 } },
    disaster_type_id: { validator: 'integer', required: true },
    disaster_start_date: { validator: 'string', required: true, options: { maxLength: 50, allowSpecialChars: true } },
    disaster_end_date: { validator: 'string', required: false, options: { maxLength: 50, allowSpecialChars: true } }
  }),
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
  validateParams({
    id: { validator: 'integer' }
  }),
  validateBody({
    disaster_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 200 } },
    disaster_type_id: { validator: 'integer', required: false },
    disaster_start_date: { validator: 'string', required: false, options: { maxLength: 50, allowSpecialChars: true } },
    disaster_end_date: { validator: 'string', required: false, options: { maxLength: 50, allowSpecialChars: true } }
  }),
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
  validateParams({
    id: { validator: 'integer' }
  }),
  deleteDisaster
);

// Export the router
module.exports = router;
