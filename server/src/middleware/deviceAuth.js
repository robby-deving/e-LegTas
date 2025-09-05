const crypto = require('crypto');

/**
 * Mobile app API key authentication
 * Protects endpoints from abuse while allowing legitimate mobile access
 */

// In production, store this in environment variables
const MOBILE_API_KEY = process.env.MOBILE_API_KEY || 'eLegTas-Mobile-2024-SecureKey';

// Simple rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500 // 500 requests per 15 minutes
};

/**
 * Generate a secure API key
 * @param {string} prefix - Optional prefix for the key
 * @returns {string} Generated API key
 */
const generateApiKey = (prefix = 'eLegTas') => {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}-${timestamp}-${randomBytes}`;
};

/**
 * Authenticate mobile app API key
 */
const authenticateMobileApp = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if API key is provided
    if (!apiKey) {
      console.log('Mobile API access denied: Missing API key');
      return res.status(401).json({
        message: 'API key required',
        error: 'Missing x-api-key header. Please include your API key.'
      });
    }

    // Validate API key
    if (apiKey !== MOBILE_API_KEY) {
      console.log('Mobile API access denied: Invalid API key:', apiKey.substring(0, 10) + '...');
      return res.status(401).json({
        message: 'Invalid API key',
        error: 'Unauthorized access. Please check your API key.'
      });
    }

    // Rate limiting
    const now = Date.now();
    const windowKey = Math.floor(now / RATE_LIMIT.windowMs);
    const rateKey = `mobile:${windowKey}`;
    
    const currentCount = rateLimitStore.get(rateKey) || 0;
    if (currentCount >= RATE_LIMIT.maxRequests) {
      console.log('Mobile API rate limit exceeded:', currentCount);
      return res.status(429).json({
        message: 'Rate limit exceeded',
        error: `Too many requests. Limit: ${RATE_LIMIT.maxRequests} per ${RATE_LIMIT.windowMs / 60000} minutes`,
        retryAfter: Math.ceil(RATE_LIMIT.windowMs / 1000)
      });
    }

    // Update rate limit counter
    rateLimitStore.set(rateKey, currentCount + 1);

    // Clean up old rate limit entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const cutoff = Math.floor((now - RATE_LIMIT.windowMs * 2) / RATE_LIMIT.windowMs);
      for (const [key] of rateLimitStore) {
        const keyWindow = parseInt(key.split(':')[1]);
        if (keyWindow < cutoff) {
          rateLimitStore.delete(key);
        }
      }
    }

    // Add request info for logging
    req.mobileApp = {
      authenticated: true,
      requestCount: currentCount + 1,
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    };

    console.log(`Mobile app authenticated - Request ${currentCount + 1}/${RATE_LIMIT.maxRequests}`);
    
    next();
  } catch (error) {
    console.error('Mobile authentication error:', error);
    return res.status(500).json({
      message: 'Authentication service error',
      error: 'Internal server error during authentication'
    });
  }
};

/**
 * Get current rate limit status
 */
const getRateLimitStatus = () => {
  const now = Date.now();
  const windowKey = Math.floor(now / RATE_LIMIT.windowMs);
  const rateKey = `mobile:${windowKey}`;
  const currentCount = rateLimitStore.get(rateKey) || 0;
  
  return {
    windowMs: RATE_LIMIT.windowMs,
    maxRequests: RATE_LIMIT.maxRequests,
    currentCount: currentCount,
    remaining: Math.max(0, RATE_LIMIT.maxRequests - currentCount),
    resetTime: new Date((windowKey + 1) * RATE_LIMIT.windowMs)
  };
};

module.exports = {
  authenticateMobileApp,
  generateApiKey,
  getRateLimitStatus,
  MOBILE_API_KEY // Export for admin use
};
