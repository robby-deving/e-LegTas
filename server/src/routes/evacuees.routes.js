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
const { authenticateUser, requirePermission, requireAnyPermission } = require('../middleware');
const { validateParams, validateQuery, validateBody } = require('../middleware/inputValidation');
const { decampFamily, undecampedCountInEvent, decampAllFamiliesInEvent, endEvacuationOperation, } = require('../controllers/decamp.controller');
const { addService } = require('../controllers/evacuees.services.controller');

// Create an Express Router instance
const router = express.Router();

// --- Evacuee Registration API Routes ---

// Search evacuee by name
router.get('/search', 
  authenticateUser, 
  requirePermission('view_evacuee_information'),
  validateQuery({
    name: { validator: 'string', required: true, options: { minLength: 1, maxLength: 100 } }
  }),
  searchEvacueeByName
);

// Search all the family head
router.get('/:disasterEvacuationEventId/family-heads', 
  authenticateUser, 
  requirePermission('view_family_information'),
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  validateQuery({
    name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  searchFamilyHeads
);

// Register a new evacuee with vulnerability data
// Allow either 'create_family_information' (standard) or 'register_outside_ec' to register evacuees
router.post('/', 
  authenticateUser, 
  requireAnyPermission(['create_family_information', 'register_outside_ec']),
  validateBody({
    // Required fields for new evacuee
    first_name: { validator: 'string', required: true, options: { minLength: 1, maxLength: 100 } },
    last_name: { validator: 'string', required: true, options: { minLength: 1, maxLength: 100 } },
    sex: { validator: 'string', required: true, options: { minLength: 1, maxLength: 20 } },
    birthdate: { validator: 'string', required: true, options: { maxLength: 50, allowSpecialChars: true } },
    barangay_of_origin: { validator: 'integer', required: true, options: { min: 1 } },
    disaster_evacuation_event_id: { validator: 'integer', required: true, options: { min: 1 } },
    
    // Optional personal information
    middle_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    suffix: { validator: 'string', required: false, options: { minLength: 1, maxLength: 20 } },
    marital_status: { validator: 'string', required: false, options: { minLength: 1, maxLength: 50 } },
    educational_attainment: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    school_of_origin: { validator: 'string', required: false, options: { minLength: 1, maxLength: 255 } },
    occupation: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    purok: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    relationship_to_family_head: { validator: 'string', required: false, options: { minLength: 1, maxLength: 50 } },
    date_registered: { validator: 'string', required: false, options: { maxLength: 50, allowSpecialChars: true } },
    
    // Optional IDs for linking/reusing existing records
    family_head_id: { validator: 'integer', required: false, options: { min: 1 } },
    existing_evacuee_resident_id: { validator: 'integer', required: false, options: { min: 1 } },
    ec_rooms_id: { validator: 'integer', required: false, options: { min: 1 } },
    
    // Vulnerability flags (booleans)
    is_infant: { validator: 'boolean', required: false },
    is_children: { validator: 'boolean', required: false },
    is_youth: { validator: 'boolean', required: false },
    is_adult: { validator: 'boolean', required: false },
    is_senior: { validator: 'boolean', required: false },
    is_pwd: { validator: 'boolean', required: false },
    is_pregnant: { validator: 'boolean', required: false },
    is_lactating: { validator: 'boolean', required: false }
  }),
  registerEvacuee
);

// Add a new service for a family
// Requires explicit permission: permission_name = 'add_relief_service' (id 52 in permissions seeder)
router.post('/services', 
  authenticateUser, 
  requirePermission('add_relief_service'),
  validateBody({
    disaster_evacuation_event_id: { validator: 'integer', required: true, options: { min: 1 } },
    family_id: { validator: 'integer', required: true, options: { min: 1 } },
    service_received: { validator: 'string', required: true, options: { minLength: 1, maxLength: 255 } },
    added_by: { validator: 'integer', required: true, options: { min: 1 } }
  }),
  addService
);

// Route to get all barangays
router.get('/barangays', getAllBarangays);

// Transfer the head of a family (within a specific disaster event)
router.post('/:disasterEvacuationEventId/transfer-head', 
  authenticateUser, 
  requirePermission('update_family_information'),
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  validateBody({
    from_family_head_id: { validator: 'integer', required: true, options: { min: 1 } },
    to_evacuee_resident_id: { validator: 'integer', required: true, options: { min: 1 } },
    old_head_new_relationship: { validator: 'string', required: false, options: { minLength: 1, maxLength: 50 } }
  }),
  transferHead
);

// Decamp a whole family for a specific event
router.post('/:disasterEvacuationEventId/families/:familyHeadId/decamp',
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' },
    familyHeadId: { validator: 'integer' }
  }),
  validateQuery({
    dry_run: { validator: 'string', required: false, options: { maxLength: 10 } }
  }),
  validateBody({
    decampment_timestamp: { 
      validator: 'string', 
      required: false, 
      options: { maxLength: 50, allowSpecialChars: true } 
    }
  }),
  decampFamily
);

// Count currently active (undecamped) families in this event
router.get('/:disasterEvacuationEventId/undecamped-count',
  authenticateUser,
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  undecampedCountInEvent
);

// Decamp all active families using a chosen timestamp
router.post('/:disasterEvacuationEventId/decamp-all',
  authenticateUser,
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  validateBody({
    decampment_timestamp: { 
      validator: 'string', 
      required: true, 
      options: { maxLength: 50, allowSpecialChars: true } 
    }
  }),
  decampAllFamiliesInEvent
);

// Mark the event as ended (sets evacuation_end_date)
router.post('/:disasterEvacuationEventId/end',
  authenticateUser,
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  validateBody({
    evacuation_end_date: { 
      validator: 'string', 
      required: false, 
      options: { maxLength: 50, allowSpecialChars: true } 
    }
  }),
  endEvacuationOperation
);

// Update an evacuee's details by ID
router.put('/:id', 
  authenticateUser, 
  requirePermission('update_family_information'),
  validateParams({
    id: { validator: 'integer' }
  }),
  validateBody({
    // Required field for update
    disaster_evacuation_event_id: { validator: 'integer', required: true, options: { min: 1 } },
    
    // Optional personal information
    first_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    middle_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    last_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    suffix: { validator: 'string', required: false, options: { minLength: 1, maxLength: 20 } },
    sex: { validator: 'string', required: false, options: { minLength: 1, maxLength: 20 } },
    birthdate: { validator: 'string', required: false, options: { maxLength: 50, allowSpecialChars: true } },
    barangay_of_origin: { validator: 'integer', required: false, options: { min: 1 } },
    marital_status: { validator: 'string', required: false, options: { minLength: 1, maxLength: 50 } },
    educational_attainment: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    school_of_origin: { validator: 'string', required: false, options: { minLength: 1, maxLength: 255 } },
    occupation: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    purok: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    relationship_to_family_head: { validator: 'string', required: false, options: { minLength: 1, maxLength: 50 } },
    
    // Optional IDs
    family_head_id: { validator: 'integer', required: false, options: { min: 1 } },
    ec_rooms_id: { validator: 'integer', required: false, options: { min: 1 } },
    
    // Vulnerability flags (booleans)
    is_infant: { validator: 'boolean', required: false },
    is_children: { validator: 'boolean', required: false },
    is_youth: { validator: 'boolean', required: false },
    is_adult: { validator: 'boolean', required: false },
    is_senior: { validator: 'boolean', required: false },
    is_pwd: { validator: 'boolean', required: false },
    is_pregnant: { validator: 'boolean', required: false },
    is_lactating: { validator: 'boolean', required: false }
  }),
  updateEvacuee
);

// Get detailed evacuee data filtered by disaster evacuation event ID
router.get(
  '/:disasterEvacuationEventId/evacuees-information',
  authenticateUser,
  requirePermission('view_family_information'),
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  getEvacueesInformationbyDisasterEvacuationEventId
);

// Get evacuee demographic statistics by disaster evacuation event ID
router.get('/:disasterEvacuationEventId/evacuee-statistics', 
  authenticateUser, 
  requirePermission('view_evacuee_information'),
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  getEvacueeStatisticsByDisasterEvacuationEventId
);

// Get disaster and evacuation center information for a disaster evacuation event
router.get(
  '/:disasterEvacuationEventId/details',
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  getDisasterEvacuationDetails
);

// Get evacuation center rooms for a disaster evacuation event
router.get('/:disasterEvacuationEventId/rooms', 
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' }
  }),
  validateQuery({
    only_available: { validator: 'string', required: false, options: { minLength: 1, maxLength: 10 } }
  }),
  getAllRoomsForDisasterEvacuationEventId
);

// Get full evacuee details for editing (includes resident info, evacuee info, registration, and vulnerabilities)
router.get(
  '/:disasterEvacuationEventId/:evacueeResidentId/edit',
  authenticateUser,
  requirePermission('view_evacuee_information'),
  validateParams({
    disasterEvacuationEventId: { validator: 'integer' },
    evacueeResidentId: { validator: 'integer' }
  }),
  getEvacueeDetailsForEdit
);

// Export the router
module.exports = router;
