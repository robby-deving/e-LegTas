// evacuees.route.js

const express = require('express');
const evacueeController = require('../controllers/evacuee.controller'); 
const { searchEvacueeByName, searchFamilyHeads } = require('../controllers/evacueeSearch.controller');

// Create an Express Router instance
const router = express.Router();

// --- Evacuee Registration API Routes ---

// Search evacuee by name
// Example: GET /api/v1/evacuees/search?name=Juan
// @desc Search for evacuee by name
// @route GET /api/v1/evacuees/search?name={name}
// @access Public
router.get('/search', searchEvacueeByName);

// Search all the family head
// @desc Search family heads used in this disaster event (by name, optional ?q=)
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/family-heads?q=John
// @access Private (Camp Manager only)
router.get('/:disasterEvacuationEventId/family-heads', searchFamilyHeads);

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

// Transfer the head of a family (within a specific disaster event)
router.post('/:disasterEvacuationEventId/transfer-head', evacueeController.transferHead);


// Update an evacuee's details by ID
// Example: PUT /api/v1/evacuees/123
// @desc Update an evacuee's details
// @route PUT /api/v1/evacuees/:id
// @access Private (Camp Manager only)
router.put('/:id', evacueeController.updateEvacuee);

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

// Get evacuation center rooms for a disaster evacuation event
// Example: GET /api/v1/evacuees/:disasterEvacuationEventId/rooms
// @desc Get all rooms (id + name) for the evacuation center tied to the given disaster_evacuation_event_id
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/rooms
// @access Public
router.get('/:disasterEvacuationEventId/rooms', evacueeController.getAllRoomsForDisasterEvacuationEventId);

// Get full evacuee details for editing (includes resident info, evacuee info, registration, and vulnerabilities)
// Example: GET /api/v1/evacuees/:disasterEvacuationEventId/:evacueeResidentId/edit
// @desc Fetch all the details needed to prefill the edit evacuee modal for a given disaster evacuation event and evacuee
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/:evacueeResidentId/edit
// @access Private (Camp Manager only)
router.get( '/:disasterEvacuationEventId/:evacueeResidentId/edit', evacueeController.getEvacueeDetailsForEdit );

// Export the router
module.exports = router;
