// evacuees.routes.js

const express = require('express');
const evacueeController = require('../controllers/evacuee.controller'); 
const { searchEvacueeByName } = require('../controllers/evacueeSearch.controller');

// Create an Express Router instance
const router = express.Router();

// --- Evacuee Registration API Routes ---

// Search evacuee by name
// Example: GET /api/v1/evacuees/search?name=Juan
// @desc Search for evacuee by name
// @route GET /api/v1/evacuees/search?name={name}
// @access Public
router.get('/search', searchEvacueeByName);

// Register a new evacuee with vulnerability data
// Example: POST /api/v1/evacuees with JSON body
// @desc Register a new evacuee
// @route POST /api/v1/evacuees
// @access Private (Camp Manager only)
router.post('/', evacueeController.registerEvacuee);
// Route to get all barangays
// Example: GET /api/v1/barangays
// @desc Get all barangays
// @route GET /api/v1/barangays
// @access Public
router.get('/barangays', evacueeController.getAllBarangays);

// Update an evacuee's details by ID
// Example: PUT /api/v1/evacuees/123
// @desc Update an evacuee's details
// @route PUT /api/v1/evacuees/:id
// @access Private (Camp Manager only)
router.put('/:id', evacueeController.updateEvacuee);

// Get full evacuee demographic breakdown by family head ID
// Example: GET /api/v1/evacuees/family/:family_head_id
// @desc Get detailed evacuee data for a given family head ID, includes summary counts, demographics, and list of evacuees
// @route GET /api/v1/evacuees/family/:family_head_id
// @access Private (Camp Manager only)
// router.get('/family/:family_head_id', evacueeController.getRegisterEvacueeByFamilyId);

// Get detailed evacuee data filtered by disaster evacuation event ID
// Example: GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
// @desc Get detailed evacuee data by disaster evacuation event ID, includes summary, room details, and full list of evacuees
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
// @access Public 
router.get('/:disasterEvacuationEventId/evacuees-information', evacueeController.getEvacueesInformationbyDisasterEvacuationEventId);


// @desc Get evacuee demographic statistics by disaster evacuation event ID
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuee-statistics
// @access Public
router.get('/:disasterEvacuationEventId/evacuee-statistics', evacueeController.getEvacueeStatisticsByDisasterEvacuationEventId);

// @desc Get disaster and evacuation center information for a given disaster evacuation event
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/details
// @access Public
router.get('/:disasterEvacuationEventId/details', evacueeController.getDisasterEvacuationDetails);

// Export the router
module.exports = router;
