// evacuation.route.js

const express = require('express');
const evacuationController = require('../controllers/evacuationCenters.controller');
const { authenticateUser, originalRequirePermission } = require('../middleware');

// Alias the DB-backed permission checker for clarity
const requirePermission = originalRequirePermission;

// Create an Express Router instance
const router = express.Router();

// --- Evacuation Center API Routes ---

// GET all evacuation center entries
// Example: GET /api/v1/evacuation-centers
router.get(
  '/',
  authenticateUser,
  requirePermission('view_evacuation_centers'),
  evacuationController.getAllEvacuationCenters
);

router.get(
  '/detailed-map-data',
  authenticateUser,
  requirePermission('view_evacuation_centers'),
  evacuationController.getEvacuationCenterMapData
);

// GET a single evacuation center entry by ID
// Example: GET /api/v1/evacuation-centers/123
router.get(
  '/:id',
  authenticateUser,
  requirePermission('view_evacuation_centers'),
  evacuationController.getEvacuationCenterById
);

// GET evacuation center with its rooms
// Example: GET /api/v1/evacuation-centers/123/rooms
router.get(
  '/:id/rooms',
  authenticateUser,
  requirePermission('view_evacuation_centers'),
  evacuationController.getEvacuationCenterWithRooms
);

// POST a new evacuation center entry
// Example: POST /api/v1/evacuation-centers with JSON body
router.post(
  '/',
  authenticateUser,
  requirePermission('create_evacuation_center'),
  evacuationController.createEvacuationCenter
);

// PUT (Update) an existing evacuation center entry by ID
// Example: PUT /api/v1/evacuation-centers/123 with JSON body
router.put(
  '/:id',
  authenticateUser,
  requirePermission('update_evacuation_center'),
  evacuationController.updateEvacuationCenter
);

// DELETE an evacuation center entry by ID
// Example: DELETE /api/v1/evacuation-centers/123
router.delete(
  '/:id',
  authenticateUser,
  requirePermission('delete_evacuation_center'),
  evacuationController.deleteEvacuationCenter
);

// Soft delete an evacuation center
// Example: PUT /api/v1/evacuation-centers/123/soft-delete
router.put(
  '/:id/soft-delete',
  authenticateUser,
  requirePermission('delete_evacuation_center'),
  evacuationController.softDeleteEvacuationCenter
);

// Restore a soft-deleted evacuation center
// Example: PUT /api/v1/evacuation-centers/123/restore
router.put(
  '/:id/restore',
  authenticateUser,
  requirePermission('update_evacuation_center'),
  evacuationController.restoreEvacuationCenter
);

// Export the router
module.exports = router;