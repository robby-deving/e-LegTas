/**
 * Rate Limiting Configuration
 * Production-ready configuration for different environments
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Base configuration that can be overridden by environment variables
const config = {
  // Global rate limiting
  global: {
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX_AUTH) || (isProduction ? 1000 : 2000),
    maxAnonymous: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX_ANON) || (isProduction ? 100 : 200),
  },

  // Authentication rate limiting
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || (isProduction ? 5 : 10),
  },

  // Password reset rate limiting
  passwordReset: {
    windowMs: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX) || (isProduction ? 3 : 5),
  },

  // API rate limiting
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_API_MAX_AUTH) || (isProduction ? 500 : 1000),
    maxAnonymous: parseInt(process.env.RATE_LIMIT_API_MAX_ANON) || (isProduction ? 50 : 100),
  },

  // File upload rate limiting
  upload: {
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    maxAdmin: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX_ADMIN) || (isProduction ? 100 : 200),
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX_AUTH) || (isProduction ? 20 : 50),
    maxAnonymous: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX_ANON) || (isProduction ? 5 : 10),
  },

  // Report generation rate limiting
  report: {
    windowMs: parseInt(process.env.RATE_LIMIT_REPORT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    maxAdmin: parseInt(process.env.RATE_LIMIT_REPORT_MAX_ADMIN) || (isProduction ? 50 : 100),
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_REPORT_MAX_AUTH) || (isProduction ? 10 : 20),
    maxAnonymous: parseInt(process.env.RATE_LIMIT_REPORT_MAX_ANON) || (isProduction ? 2 : 5),
  },

  // Search rate limiting
  search: {
    windowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_SEARCH_MAX_AUTH) || (isProduction ? 100 : 200),
    maxAnonymous: parseInt(process.env.RATE_LIMIT_SEARCH_MAX_ANON) || (isProduction ? 20 : 50),
  },

  // Dashboard rate limiting
  dashboard: {
    windowMs: parseInt(process.env.RATE_LIMIT_DASHBOARD_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    maxAdmin: parseInt(process.env.RATE_LIMIT_DASHBOARD_MAX_ADMIN) || (isProduction ? 200 : 400),
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_DASHBOARD_MAX_AUTH) || (isProduction ? 100 : 200),
    maxAnonymous: parseInt(process.env.RATE_LIMIT_DASHBOARD_MAX_ANON) || (isProduction ? 10 : 20),
  },

  // Redis configuration for distributed rate limiting (if using Redis)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
  },

  // Trust proxy configuration for accurate IP detection
  trustProxy: process.env.TRUST_PROXY === 'true' || isProduction,
};

// Validation function to ensure configuration is valid
const validateConfig = () => {
  const errors = [];

  // Check for reasonable limits
  if (config.global.maxAnonymous > config.global.maxAuthenticated) {
    errors.push('Anonymous users should not have higher limits than authenticated users');
  }

  if (config.auth.max > 20) {
    errors.push('Authentication rate limit should not exceed 20 attempts per window');
  }

  if (config.passwordReset.max > 10) {
    errors.push('Password reset rate limit should not exceed 10 attempts per window');
  }

  if (errors.length > 0) {
    throw new Error(`Rate limiting configuration errors: ${errors.join(', ')}`);
  }
};

// Validate configuration on load
validateConfig();

module.exports = {
  config,
  isProduction,
  isDevelopment,
  validateConfig
};
