const express = require('express');
const { resetPassword, sendOTP, login } = require('../controllers/auth.controller');

const router = express.Router();

// Auth routes
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOTP);

module.exports = router;
