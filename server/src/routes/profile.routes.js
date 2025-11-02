// routes/profile.routes.js

const express = require('express');
const { getUserProfile, updateUserProfile } = require('../controllers/profile.controller');
const { authenticateUser, requirePermission } = require('../middleware');
const { validateParams, validateBody } = require('../middleware/inputValidation');

const router = express.Router();

// --- Profile API Routes ---

// Get profile by userId
// Example: GET /api/v1/profile/123
router.get('/:userId', 
  authenticateUser, 
  requirePermission('view_profile'),
  validateParams({
    userId: { validator: 'integer' }
  }),
  getUserProfile
);

// Update profile by userId
// Example: PUT /api/v1/profile/123
router.put('/:userId', 
  authenticateUser, 
  requirePermission('update_profile'),
  validateParams({
    userId: { validator: 'integer' }
  }),
  validateBody({
    email: { validator: 'email', required: false },
    phone_number: { validator: 'string', required: false, options: { minLength: 7, maxLength: 20 } },
    first_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    last_name: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  updateUserProfile
);

module.exports = router;