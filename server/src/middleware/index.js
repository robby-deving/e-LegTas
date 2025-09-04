/**
 * Middleware index file - simplified exports
 * Only exports essential authentication and permission middleware
 */

const { authenticateUser, basicAuth } = require('./auth');
const { 
  requirePermission,
  requireAnyPermission
} = require('./permissions');

// Export only the essential middleware
module.exports = {
  // Authentication (from auth.js)
  authenticateUser,
  basicAuth,
  
  // Permissions (from permissions.js)
  requirePermission,
  requireAnyPermission
};