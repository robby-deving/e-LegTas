const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { config, isProduction } = require('../config/rateLimiting');
const { getRateLimitIP } = require('../utils/ipAddress');

/**
 * Production-ready rate limiting configuration
 * Following OWASP guidelines and industry best practices
 */

// Custom key generator that considers authentication status
// Uses our IP utility for comprehensive IP handling
const keyGenerator = (req) => {
  // Use user ID if authenticated, otherwise use IP with proper handling
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  // Use our IP utility for comprehensive IP detection and normalization
  return `ip:${getRateLimitIP(req)}`;
};

// Custom skip function for authenticated users with higher privileges
const skipSuccessfulRequests = (req, res) => {
  // Skip rate limiting for successful requests from admin users
  if (req.user && req.user.role_id === 1 && res.statusCode < 400) {
    return true;
  }
  return false;
};

// Standard error handler for rate limiting
const standardHandler = (req, res) => {
  const message = 'Too many requests, please try again later';
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous'
  });
  
  res.status(429).json({
    error: 'Rate limit exceeded',
    message,
    retryAfter: Math.round(req.rateLimit.resetTime / 1000) || 60
  });
};

// Strict error handler for sensitive endpoints
const strictHandler = (req, res) => {
  const message = 'Too many attempts, please try again later';
  logger.error('Strict rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    severity: 'high'
  });
  
  res.status(429).json({
    error: 'Rate limit exceeded',
    message,
    retryAfter: Math.round(req.rateLimit.resetTime / 1000) || 300
  });
};

/**
 * Global rate limiting - applies to all requests
 * More lenient for authenticated users, stricter for anonymous
 */
const globalRateLimit = rateLimit({
  windowMs: config.global.windowMs,
  max: (req) => {
    // Different limits based on authentication status
    if (req.user && req.user.id) {
      return config.global.maxAuthenticated;
    }
    return config.global.maxAnonymous;
  },
  keyGenerator,
  skip: skipSuccessfulRequests,
  handler: standardHandler,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Global rate limit exceeded',
    message: 'Too many requests from this IP/user, please try again later'
  }
});

/**
 * Authentication rate limiting - for login/register endpoints
 * Very strict to prevent brute force attacks
 */
const authRateLimit = rateLimit({
  windowMs: config.auth.windowMs,
  max: config.auth.max,
  keyGenerator: (req) => `auth:${getRateLimitIP(req)}`,
  handler: strictHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Count failed requests too
  message: {
    error: 'Authentication rate limit exceeded',
    message: 'Too many authentication attempts, please try again later'
  }
});

/**
 * Password reset rate limiting
 * Prevents abuse of password reset functionality
 */
const passwordResetRateLimit = rateLimit({
  windowMs: config.passwordReset.windowMs,
  max: config.passwordReset.max,
  keyGenerator: (req) => `password-reset:${getRateLimitIP(req)}`,
  handler: strictHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Password reset rate limit exceeded',
    message: 'Too many password reset attempts, please try again later'
  }
});

/**
 * API rate limiting - for general API endpoints
 * Moderate limits for API usage
 */
const apiRateLimit = rateLimit({
  windowMs: config.api.windowMs,
  max: (req) => {
    if (req.user && req.user.id) {
      return config.api.maxAuthenticated;
    }
    return config.api.maxAnonymous;
  },
  keyGenerator,
  skipSuccessfulRequests,
  handler: standardHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many API requests, please try again later'
  }
});

/**
 * File upload rate limiting
 * Prevents abuse of file upload endpoints
 */
const uploadRateLimit = rateLimit({
  windowMs: config.upload.windowMs,
  max: (req) => {
    if (req.user && req.user.role_id === 1) {
      return config.upload.maxAdmin;
    }
    if (req.user && req.user.id) {
      return config.upload.maxAuthenticated;
    }
    return config.upload.maxAnonymous;
  },
  keyGenerator,
  handler: standardHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads, please try again later'
  }
});

/**
 * Report generation rate limiting
 * Prevents abuse of report generation (resource-intensive)
 */
const reportRateLimit = rateLimit({
  windowMs: config.report.windowMs,
  max: (req) => {
    if (req.user && req.user.role_id === 1) {
      return config.report.maxAdmin;
    }
    if (req.user && req.user.id) {
      return config.report.maxAuthenticated;
    }
    return config.report.maxAnonymous;
  },
  keyGenerator,
  handler: standardHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Report generation rate limit exceeded',
    message: 'Too many report generation requests, please try again later'
  }
});

/**
 * Search rate limiting
 * Prevents abuse of search functionality
 */
const searchRateLimit = rateLimit({
  windowMs: config.search.windowMs,
  max: (req) => {
    if (req.user && req.user.id) {
      return config.search.maxAuthenticated;
    }
    return config.search.maxAnonymous;
  },
  keyGenerator,
  handler: standardHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Search rate limit exceeded',
    message: 'Too many search requests, please try again later'
  }
});

/**
 * Dashboard rate limiting
 * Moderate limits for dashboard data requests
 */
const dashboardRateLimit = rateLimit({
  windowMs: config.dashboard.windowMs,
  max: (req) => {
    if (req.user && req.user.role_id === 1) {
      return config.dashboard.maxAdmin;
    }
    if (req.user && req.user.id) {
      return config.dashboard.maxAuthenticated;
    }
    return config.dashboard.maxAnonymous;
  },
  keyGenerator,
  handler: standardHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Dashboard rate limit exceeded',
    message: 'Too many dashboard requests, please try again later'
  }
});

module.exports = {
  globalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
  uploadRateLimit,
  reportRateLimit,
  searchRateLimit,
  dashboardRateLimit
};
