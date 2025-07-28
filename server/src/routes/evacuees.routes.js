// evacuees.routes.js

const express = require('express');
const evacueeController = require('../controllers/evacuee.controller'); 
const { searchEvacueeByName } = require('../controllers/evacueeSearch.controller');


// Create an Express Router instance
const router = express.Router();

// --- Evacuee Registration API Routes ---

// GET /api/v1/evacuees/search?name=Juan
router.get('/search', searchEvacueeByName);

// POST a new evacuee with vulnerability data
// Example: POST /api/v1/evacuees with JSON body
router.post('/', evacueeController.registerEvacuee);

// Future:
// GET all evacuees (optional)
// router.get('/', evacueeController.getAllEvacuees);
router.get('/:id', evacueeController.getEvacueeById);

// Get full evacuee demographic breakdown by family head ID
router.get('/family/:family_head_id', evacueeController.getRegisterEvacueeByFamilyId);

// GET a single evacuee by ID (optional)
// router.get('/:id', evacueeController.getEvacueeById);

// PUT (Update) evacuee info by ID (optional)
// router.put('/:id', evacueeController.updateEvacuee);

// DELETE an evacuee record by ID (optional)
// router.delete('/:id', evacueeController.deleteEvacuee);

// Export the router
module.exports = router;
        