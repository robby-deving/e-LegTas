const express = require('express');
const { resetPassword, sendOTP } = require('../controllers/auth.controller');

const router = express.Router();

// Auth routes
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOTP);

module.exports = router;
