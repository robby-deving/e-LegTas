const express = require('express');
const { resetPassword, sendOTP, login, refresh } = require('../controllers/auth.controller');

const router = express.Router();

// Auth routes
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOTP);
router.post('/refresh', refresh);

module.exports = router;
