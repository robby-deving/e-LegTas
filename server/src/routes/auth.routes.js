const express = require('express');
const { resetPassword, sendOTP, login, refresh } = require('../controllers/auth.controller');
const { passwordResetRateLimit } = require('../middleware/rateLimiting');

const router = express.Router();

// Auth routes with specific rate limiting
router.post('/login', login);
router.post('/reset-password', passwordResetRateLimit, resetPassword);
router.post('/send-otp', passwordResetRateLimit, sendOTP);
router.post('/refresh', refresh);

module.exports = router;
