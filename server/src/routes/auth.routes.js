const express = require('express');
const { resetPassword, sendOTP, login, refresh } = require('../controllers/auth.controller');
const { passwordResetRateLimit } = require('../middleware/rateLimiting');
const { validateBody } = require('../middleware/inputValidation');

const router = express.Router();

// Auth routes with specific rate limiting and input validation

// Login endpoint - validate email and password
router.post('/login', 
  validateBody({
    email: { validator: 'email', required: true },
    password: { validator: 'password', required: true }
  }),
  login
);

// Reset password endpoint - validate email, OTP, and new password
router.post('/reset-password', 
  passwordResetRateLimit,
  validateBody({
    email: { validator: 'email', required: true },
    otp: { validator: 'otp', required: true },
    newPassword: { validator: 'password', required: true }
  }),
  resetPassword
);

// Send OTP endpoint - validate email
router.post('/send-otp', 
  passwordResetRateLimit,
  validateBody({
    email: { validator: 'email', required: true }
  }),
  sendOTP
);

// Refresh token endpoint - validate refresh token
router.post('/refresh', 
  validateBody({
    refresh_token: { 
      validator: 'string', 
      required: true,
      options: { minLength: 20, maxLength: 1000, allowSpecialChars: true }
    }
  }),
  refresh
);

module.exports = router;
