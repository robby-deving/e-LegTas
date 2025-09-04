// evacuees.route.js

const express = require('express');
const { 
  registerEvacuee,
  getAllBarangays,
  transferHead,
  updateEvacuee,
  getEvacueesInformationbyDisasterEvacuationEventId,
  getEvacueeStatisticsByDisasterEvacuationEventId,
  getDisasterEvacuationDetails,
  getAllRoomsForDisasterEvacuationEventId,
  getEvacueeDetailsForEdit
} = require('../controllers/evacuee.controller');
const { searchEvacueeByName, searchFamilyHeads } = require('../controllers/evacueeSearch.controller');
const { authenticateUser, requirePermission } = require('../middleware');
const {
  decampFamily,
  undecampedCountInEvent,
  decampAllFamiliesInEvent,
  endEvacuationOperation,
} = require('../controllers/decamp.controller');


// Create an Express Router instance
const router = express.Router();

// --- Evacuee Registration API Routes ---

// Search evacuee by name
// Example: GET /api/v1/evacuees/search?name=Juan
// @desc Search for evacuee by name
// @route GET /api/v1/evacuees/search?name={name}
// @access Private (requires view_evacuee_information permission)
router.get('/search', authenticateUser, requirePermission('view_evacuee_information'), searchEvacueeByName);

// Search all the family head
// @desc Search family heads used in this disaster event (by name, optional ?q=)
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/family-heads?q=John
// @access Private (requires view_family_information permission)
router.get('/:disasterEvacuationEventId/family-heads', authenticateUser, requirePermission('view_family_information'), searchFamilyHeads);

// Register a new evacuee with vulnerability data
// Example: POST /api/v1/evacuees with JSON body
// @desc Register a new evacuee
// @route POST /api/v1/evacuees
// @access Private (requires create_family_information permission)
router.post('/', authenticateUser, requirePermission('create_family_information'), registerEvacuee);
// Route to get all barangays
// Example: GET /api/v1/barangays
// @desc Get all barangays
// @route GET /api/v1/barangays
// @access Public
router.get('/barangays', getAllBarangays);

// Transfer the head of a family (within a specific disaster event)
// @desc Transfer family head within a disaster event
// @route POST /api/v1/evacuees/:disasterEvacuationEventId/transfer-head
// @access Private (requires update_family_information permission)
router.post('/:disasterEvacuationEventId/transfer-head', authenticateUser, requirePermission('update_family_information'), transferHead);

// Decamp a whole family for a specific event
router.post('/:disasterEvacuationEventId/families/:familyHeadId/decamp', decampFamily);

// Count currently active (undecamped) families in this event
router.get(
  '/:disasterEvacuationEventId/undecamped-count',
  authenticateUser,
  undecampedCountInEvent
);

// Decamp all active families using a chosen timestamp
router.post(
  '/:disasterEvacuationEventId/decamp-all',
  authenticateUser,
  decampAllFamiliesInEvent
);

// Mark the event as ended (sets evacuation_end_date)
router.post(
  '/:disasterEvacuationEventId/end',
  authenticateUser,
  endEvacuationOperation
);


// Update an evacuee's details by ID
// Example: PUT /api/v1/evacuees/123
// @desc Update an evacuee's details
// @route PUT /api/v1/evacuees/:id
// @access Private (requires update_family_information permission)
router.put('/:id', authenticateUser, requirePermission('update_family_information'), updateEvacuee);

// Get detailed evacuee data filtered by disaster evacuation event ID
// Example: GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
// @desc Get detailed evacuee data by disaster evacuation event ID, includes summary, room details, and full list of evacuees
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
// @access Private (requires view_family_information permission)
router.get('/:disasterEvacuationEventId/evacuees-information', authenticateUser, requirePermission('view_family_information'), getEvacueesInformationbyDisasterEvacuationEventId);


// @desc Get evacuee demographic statistics by disaster evacuation event ID
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuee-statistics
// @access Public
router.get('/:disasterEvacuationEventId/evacuee-statistics', authenticateUser, requirePermission('view_evacuee_information'), getEvacueeStatisticsByDisasterEvacuationEventId);

// @desc Get disaster and evacuation center information for a given disaster evacuation event
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/details
// @access Public
router.get('/:disasterEvacuationEventId/details', getDisasterEvacuationDetails);

// Get evacuation center rooms for a disaster evacuation event
// Example: GET /api/v1/evacuees/:disasterEvacuationEventId/rooms
// @desc Get all rooms (id + name) for the evacuation center tied to the given disaster_evacuation_event_id
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/rooms
// @access Public
router.get('/:disasterEvacuationEventId/rooms', getAllRoomsForDisasterEvacuationEventId);

// Get full evacuee details for editing (includes resident info, evacuee info, registration, and vulnerabilities)
// Example: GET /api/v1/evacuees/:disasterEvacuationEventId/:evacueeResidentId/edit
// @desc Fetch all the details needed to prefill the edit evacuee modal for a given disaster evacuation event and evacuee
// @route GET /api/v1/evacuees/:disasterEvacuationEventId/:evacueeResidentId/edit
// @access Private (requires view_evacuee_information permission)
router.get( '/:disasterEvacuationEventId/:evacueeResidentId/edit', authenticateUser, requirePermission('view_evacuee_information'), getEvacueeDetailsForEdit );

// Export the router
module.exports = router;
