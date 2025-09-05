/**
 * IP Address Utility
 * Provides comprehensive IP address detection and handling
 * Supports various proxy configurations and IPv6 addresses
 */

const logger = require('./logger');

/**
 * Get the real IP address of the client
 * Handles various proxy configurations and IPv6 addresses
 * 
 * @param {Object} req - Express request object
 * @returns {string} The client's IP address
 */
const getClientIP = (req) => {
  try {
    // Check for IP in various headers (in order of preference)
    const ipSources = [
      req.headers['cf-connecting-ip'],     // Cloudflare
      req.headers['x-forwarded-for'],      // Standard proxy header
      req.headers['x-real-ip'],            // Nginx proxy
      req.headers['x-client-ip'],          // Apache proxy
      req.headers['x-forwarded'],          // Alternative proxy header
      req.headers['forwarded-for'],        // Alternative proxy header
      req.headers['forwarded'],            // RFC 7239
      req.connection?.remoteAddress,       // Direct connection
      req.socket?.remoteAddress,           // Socket connection
      req.info?.remoteAddress,             // Hapi.js
      req.ip                              // Express default
    ];

    // Find the first valid IP address
    for (const ip of ipSources) {
      if (ip && isValidIP(ip)) {
        // Handle comma-separated IPs (x-forwarded-for can contain multiple IPs)
        const cleanIP = ip.split(',')[0].trim();
        if (isValidIP(cleanIP)) {
          return cleanIP;
        }
      }
    }

    // Fallback to Express default
    return req.ip || '127.0.0.1';
  } catch (error) {
    logger.error('Error getting client IP address', { error: error.message });
    return '127.0.0.1'; // Safe fallback
  }
};

/**
 * Validate if a string is a valid IP address (IPv4 or IPv6)
 * 
 * @param {string} ip - IP address string to validate
 * @returns {boolean} True if valid IP address
 */
const isValidIP = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Remove any whitespace
  ip = ip.trim();

  // Check for IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) {
    return true;
  }

  // Check for IPv6
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  if (ipv6Regex.test(ip)) {
    return true;
  }

  // Check for IPv6 with double colon (compressed)
  const ipv6CompressedRegex = /^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^::$/;
  if (ipv6CompressedRegex.test(ip)) {
    return true;
  }

  return false;
};

/**
 * Check if an IP address is a private/internal IP
 * 
 * @param {string} ip - IP address to check
 * @returns {boolean} True if private IP
 */
const isPrivateIP = (ip) => {
  if (!isValidIP(ip)) {
    return false;
  }

  // IPv4 private ranges
  const privateIPv4Ranges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^0\./,                     // 0.0.0.0/8
  ];

  // IPv6 private ranges
  const privateIPv6Ranges = [
    /^::1$/,                    // ::1 (localhost)
    /^::ffff:127\./,            // IPv4-mapped localhost
    /^fe80:/,                   // Link-local
    /^fc00:/,                   // Unique local
    /^fd00:/,                   // Unique local
  ];

  // Check IPv4 private ranges
  for (const range of privateIPv4Ranges) {
    if (range.test(ip)) {
      return true;
    }
  }

  // Check IPv6 private ranges
  for (const range of privateIPv6Ranges) {
    if (range.test(ip)) {
      return true;
    }
  }

  return false;
};

/**
 * Get IP address information for logging and debugging
 * 
 * @param {Object} req - Express request object
 * @returns {Object} IP address information
 */
const getIPInfo = (req) => {
  const clientIP = getClientIP(req);
  
  return {
    ip: clientIP,
    isPrivate: isPrivateIP(clientIP),
    isIPv6: clientIP.includes(':'),
    userAgent: req.get('User-Agent'),
    forwardedFor: req.headers['x-forwarded-for'],
    realIP: req.headers['x-real-ip'],
    cfConnectingIP: req.headers['cf-connecting-ip'],
    connectionIP: req.connection?.remoteAddress,
    socketIP: req.socket?.remoteAddress,
    expressIP: req.ip
  };
};

/**
 * Middleware to add IP address information to request object
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const ipAddressMiddleware = (req, res, next) => {
  try {
    // Add IP information to request object
    req.clientIP = getClientIP(req);
    req.ipInfo = getIPInfo(req);
    
    // Log IP information for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Client IP information', {
        ip: req.clientIP,
        isPrivate: req.ipInfo.isPrivate,
        isIPv6: req.ipInfo.isIPv6,
        userAgent: req.ipInfo.userAgent
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error in IP address middleware', { error: error.message });
    // Set fallback IP
    req.clientIP = '127.0.0.1';
    req.ipInfo = {
      ip: '127.0.0.1',
      isPrivate: true,
      isIPv6: false,
      userAgent: req.get('User-Agent')
    };
    next();
  }
};

/**
 * Get IP address for rate limiting (normalized for consistent hashing)
 * 
 * @param {Object} req - Express request object
 * @returns {string} Normalized IP address for rate limiting
 */
const getRateLimitIP = (req) => {
  const ip = getClientIP(req);
  
  // For IPv6, we might want to normalize it for rate limiting
  if (ip.includes(':')) {
    // IPv6 - could normalize to /64 subnet for privacy
    // For now, return as-is, but this could be enhanced
    return ip;
  }
  
  return ip;
};

/**
 * Check if request is from a trusted proxy
 * 
 * @param {Object} req - Express request object
 * @returns {boolean} True if from trusted proxy
 */
const isFromTrustedProxy = (req) => {
  const trustedProxies = [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ];

  const clientIP = getClientIP(req);
  
  // Check if IP is in trusted ranges
  for (const proxy of trustedProxies) {
    if (proxy.includes('/')) {
      // CIDR notation - simplified check
      if (clientIP.startsWith(proxy.split('/')[0].split('.').slice(0, -1).join('.'))) {
        return true;
      }
    } else if (clientIP === proxy) {
      return true;
    }
  }
  
  return false;
};

module.exports = {
  getClientIP,
  isValidIP,
  isPrivateIP,
  getIPInfo,
  ipAddressMiddleware,
  getRateLimitIP,
  isFromTrustedProxy
};
