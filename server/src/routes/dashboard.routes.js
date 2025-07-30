//dashboard.routes.js

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller'); // Adjust path based on your structure

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


// Future dashboard routes can follow this format:
// router.get('/total-evacuees/:disasterId', dashboardController.getTotalEvacuees);
// router.get('/camp-managers/:disasterId', dashboardController.getActiveCampManagers);

// Export the router
module.exports = router;

