// routes/profile.routes.js

const express = require('express');
const { getUserProfile, updateUserProfile } = require('../controllers/profile.controller');
const { authenticateUser, requirePermission } = require('../middleware');

const router = express.Router();

// --- Profile API Routes ---

// Get profile by userId
// Example: GET /api/v1/profile/123
router.get('/:userId', authenticateUser, requirePermission('view_profile'), getUserProfile);

// Update profile by userId
// Example: PUT /api/v1/profile/123
router.put('/:userId', authenticateUser, requirePermission('update_profile'), updateUserProfile);

module.exports = router;