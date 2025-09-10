// evacuees.route.js

const express = require('express');
const { registerEvacuee } = require('../controllers/evacuees.register.controller.js');
const { searchEvacueeByName, searchFamilyHeads } = require('../controllers/evacuees.search.controller.js');
const { getAllBarangays } = require('../controllers/evacuees.barangays.controller');
const { getDisasterEvacuationDetails } = require('../controllers/evacuees.event-details.controller');
const { getAllRoomsForDisasterEvacuationEventId } = require('../controllers/evacuees.rooms.controller');
const { getEvacueeDetailsForEdit } = require('../controllers/evacuees.edit.controller');
const { transferHead } = require('../controllers/evacuees.transferhead.controller');
const { getEvacueeStatisticsByDisasterEvacuationEventId } = require('../controllers/evacuees.stats.controller');
const { getEvacueesInformationbyDisasterEvacuationEventId } = require('../controllers/evacuees.event-evacuees-information.controller');
const { updateEvacuee } = require('../controllers/evacuees.update-registration.controller');
const { authenticateUser, requirePermission } = require('../middleware');
const { decampFamily, undecampedCountInEvent, decampAllFamiliesInEvent, endEvacuationOperation, } = require('../controllers/decamp.controller');

// Create an Express Router instance
const router = express.Router();

// --- Evacuee Registration API Routes ---

// Search evacuee by name
router.get('/search', authenticateUser, requirePermission('view_evacuee_information'), searchEvacueeByName);

// Search all the family head
router.get('/:disasterEvacuationEventId/family-heads', authenticateUser, requirePermission('view_family_information'), searchFamilyHeads);

// Register a new evacuee with vulnerability data
router.post('/', authenticateUser, requirePermission('create_family_information'), registerEvacuee);

// Route to get all barangays
router.get('/barangays', getAllBarangays);

// Transfer the head of a family (within a specific disaster event)
router.post('/:disasterEvacuationEventId/transfer-head', authenticateUser, requirePermission('update_family_information'), transferHead);

// Decamp a whole family for a specific event
router.post('/:disasterEvacuationEventId/families/:familyHeadId/decamp', decampFamily);

// Count currently active (undecamped) families in this event
router.get('/:disasterEvacuationEventId/undecamped-count', authenticateUser, undecampedCountInEvent);

// Decamp all active families using a chosen timestamp
router.post('/:disasterEvacuationEventId/decamp-all', authenticateUser, decampAllFamiliesInEvent);

// Mark the event as ended (sets evacuation_end_date)
router.post('/:disasterEvacuationEventId/end', authenticateUser, endEvacuationOperation);

// Update an evacuee's details by ID
router.put('/:id', authenticateUser, requirePermission('update_family_information'), updateEvacuee);

// Get detailed evacuee data filtered by disaster evacuation event ID
router.get('/:disasterEvacuationEventId/evacuees-information', authenticateUser, requirePermission('view_family_information'), getEvacueesInformationbyDisasterEvacuationEventId);

// Get evacuee demographic statistics by disaster evacuation event ID
router.get('/:disasterEvacuationEventId/evacuee-statistics', authenticateUser, requirePermission('view_evacuee_information'), getEvacueeStatisticsByDisasterEvacuationEventId);

// Get disaster and evacuation center information for a disaster evacuation event
router.get('/:disasterEvacuationEventId/details', getDisasterEvacuationDetails);

// Get evacuation center rooms for a disaster evacuation event
router.get('/:disasterEvacuationEventId/rooms', getAllRoomsForDisasterEvacuationEventId);

// Get full evacuee details for editing (includes resident info, evacuee info, registration, and vulnerabilities)
router.get( '/:disasterEvacuationEventId/:evacueeResidentId/edit', authenticateUser, requirePermission('view_evacuee_information'), getEvacueeDetailsForEdit );

// Export the router
module.exports = router;
