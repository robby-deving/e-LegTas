//dashboard.routes.js

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller'); // Adjust path based on your structure
const { authenticateUser, requirePermission } = require('../middleware');

// Create an Express Router instance
const router = express.Router();

// --- Dashboard API Routes ---

// GET total active evacuation centers for a specific disaster
// Example: GET /api/v1/dashboard/evacuation-centers/:disasterId
router.get('/active-evacuation-centers/:disasterId', dashboardController.getActiveEvacuationCentersByDisaster);
// GET total registered evacuees for a specific disaster
// Example: GET /api/v1/dashboard/registered-evacuees/:disasterId
router.get('/registered-evacuees/:disasterId', dashboardController.getTotalRegisteredEvacueesByDisaster);
// GET total registered families for a specific disaster
// Example: GET /api/v1/dashboard/registered-families/:disasterId
router.get('/registered-families/:disasterId', dashboardController.getTotalRegisteredFamiliesByDisaster);
// GET evacuee statistics by vulnerability type for a specific disaster
// Example: GET /api/v1/dashboard/evacuee-statistics/:disasterId
router.get('/evacuee-statistics/:disasterId', dashboardController.getEvacueeStatisticsByDisaster);
// GET evacuation center capacity status for a specific disaster
// Example: GET /api/v1/dashboard/capacity-status/:disasterId
router.get('/capacity-status/:disasterId', dashboardController.getEvacuationCenterCapacityStatus);
// GET all active disasters
// Example: GET - /api/v1/dashboard/disasters
router.get('/disasters', dashboardController.getActiveDisasters);

// For Camp Manager Dashboard - Protected with view_dashboard_specific permission

router.get('/camp-manager/disasters/:userId', 
  authenticateUser, 
  requirePermission('view_dashboard_specific'), 
  dashboardController.getCampManagerDisasters
);

router.get("/camp-manager/center/:eventId", 
  authenticateUser, 
  requirePermission('view_dashboard_specific'), 
  dashboardController.getCampManagerCenterInfo
);

router.get("/camp-manager/summary/:eventId", 
  authenticateUser, 
  requirePermission('view_dashboard_specific'), 
  dashboardController.getCampManagerDashboardSummary
);

// Future dashboard routes can follow this format:
// router.get('/total-evacuees/:disasterId', dashboardController.getTotalEvacuees);
// router.get('/camp-managers/:disasterId', dashboardController.getActiveCampManagers);

// Export the router
module.exports = router;

