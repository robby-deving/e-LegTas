/**
 * Middleware index file - simplified exports
 * Only exports essential authentication and permission middleware
 */

const { authenticateUser, basicAuth } = require('./auth');
const { 
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  attachPermissions,
  getUserPermissions,
  invalidatePermissionsCache,
  getRolePermissions
} = require('./permissions');

// Export all middleware and utilities
module.exports = {
  // Authentication (from auth.js)
  authenticateUser,
  basicAuth,
  
  // Permissions (from permissions.js)
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  attachPermissions,
  getUserPermissions,
  
  // Cache management (from permissions.js)
  invalidatePermissionsCache,
  getRolePermissions
};