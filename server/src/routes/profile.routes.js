// routes/profile.routes.js

const express = require('express');
const profileController = require('../controllers/profile.controller');

const router = express.Router();

// --- Profile API Routes ---

// Get profile by userId
// Example: GET /api/v1/profile/123
router.get('/:userId', profileController.getUserProfile);

module.exports = router;