// evacuation.route.js

const express = require('express');
const evacuationController = require('../controllers/evacuationCenters.controller');
const { authenticateUser, requirePermission, requireAnyPermission } = require('../middleware');
const { validateQuery, validateParams, validateBody } = require('../middleware/inputValidation');
const { searchEvacuations } = require('../controllers/evacuation.search.controller');

// Create an Express Router instance
const router = express.Router();

// --- Evacuation Center API Routes ---

// GET all evacuation center entries
// Example: GET /api/v1/evacuation-centers
router.get(
  '/',
  authenticateUser,
  requireAnyPermission(['view_evacuation_centers', 'view_outside_ec']),
  validateQuery({
    limit: { validator: 'integer', required: false, options: { min: 1, max: 100 } },
    offset: { validator: 'integer', required: false, options: { min: 0 } },
    search: { validator: 'string', required: false, options: { maxLength: 100 } },
    include_deleted: { validator: 'string', required: false, options: { maxLength: 10 } },
    ec_type: { validator: 'string', required: false, options: { maxLength: 20 } },
    barangay_id: { validator: 'integer', required: false }
  }),
  evacuationController.getAllEvacuationCenters
);


router.get('/search',
  validateQuery({
    disasterId: { validator: 'integer', required: true },
    search: { validator: 'string', required: false, options: { maxLength: 100 } }
  }),
  searchEvacuations
);

router.get(
  '/detailed-map-data',
  authenticateUser,
  requirePermission('view_map'),
  validateQuery({
    disaster_id: { validator: 'integer', required: false }
  }),
  evacuationController.getEvacuationCenterMapData
);

// GET a single evacuation center entry by ID
// Example: GET /api/v1/evacuation-centers/123
router.get(
  '/:id',
  authenticateUser,
  requireAnyPermission(['view_evacuation_centers', 'view_outside_ec']),
  validateParams({
    id: { validator: 'integer' }
  }),
  evacuationController.getEvacuationCenterById
);

// GET evacuation center with its rooms
// Example: GET /api/v1/evacuation-centers/123/rooms
router.get(
  '/:id/rooms',
  authenticateUser,
  requireAnyPermission(['view_evacuation_centers', 'view_outside_ec']),
  validateParams({
    id: { validator: 'integer' }
  }),
  evacuationController.getEvacuationCenterWithRooms
);

// POST a new evacuation center entry
// Example: POST /api/v1/evacuation-centers with JSON body
router.post(
  '/',
  authenticateUser,
  requireAnyPermission(['create_evacuation_center', 'add_outside_ec']),
  validateBody({
    name: { validator: 'string', required: true, options: { minLength: 1, maxLength: 200 } },
    address: { validator: 'address', required: true },
    barangay_id: { validator: 'integer', required: true },
    latitude: { validator: 'numeric', required: false, options: { allowDecimals: true } },
    longitude: { validator: 'numeric', required: false, options: { allowDecimals: true } },
    ec_status: { validator: 'string', required: true, options: { maxLength: 50 } },
    category: { validator: 'string', required: true, options: { maxLength: 100 } },
    total_capacity: { validator: 'integer', required: false, options: { min: 0 } },
    created_by: { validator: 'integer', required: true }
  }),
  evacuationController.createEvacuationCenter
);

// PUT (Update) an existing evacuation center entry by ID
// Example: PUT /api/v1/evacuation-centers/123 with JSON body
router.put(
  '/:id',
  authenticateUser,
  requireAnyPermission(['update_evacuation_center', 'edit_outside_ec']),
  validateParams({
    id: { validator: 'integer' }
  }),
  validateBody({
    name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 200 } },
    address: { validator: 'address', required: true },
    barangay_id: { validator: 'integer', required: false },
    latitude: { validator: 'numeric', required: false, options: { allowDecimals: true } },
    longitude: { validator: 'numeric', required: false, options: { allowDecimals: true } },
    ec_status: { validator: 'string', required: false, options: { maxLength: 50 } },
    category: { validator: 'string', required: false, options: { maxLength: 100 } },
    total_capacity: { validator: 'integer', required: false, options: { min: 0 } },
    assigned_user_id: { validator: 'integer', required: false }
  }),
  evacuationController.updateEvacuationCenter
);

// DELETE an evacuation center entry by ID
// Example: DELETE /api/v1/evacuation-centers/123
router.delete(
  '/:id',
  authenticateUser,
  requirePermission('delete_evacuation_center'),
  validateParams({
    id: { validator: 'integer' }
  }),
  evacuationController.deleteEvacuationCenter
);

// Soft delete an evacuation center
// Example: PUT /api/v1/evacuation-centers/123/soft-delete
router.put(
  '/:id/soft-delete',
  authenticateUser,
  requirePermission('delete_evacuation_center'),
  validateParams({
    id: { validator: 'integer' }
  }),
  evacuationController.softDeleteEvacuationCenter
);

// Restore a soft-deleted evacuation center
// Example: PUT /api/v1/evacuation-centers/123/restore
router.put(
  '/:id/restore',
  authenticateUser,
  requirePermission('update_evacuation_center'),
  validateParams({
    id: { validator: 'integer' }
  }),
  evacuationController.restoreEvacuationCenter
);

// GET assigned evacuation center for a user
// Example: GET /api/v1/evacuation-centers/user/123
router.get(
  '/user/:userId',
  authenticateUser,
  validateParams({
    userId: { validator: 'integer' }
  }),
  evacuationController.getAssignedEvacuationCenter
);

// Export the router
module.exports = router;