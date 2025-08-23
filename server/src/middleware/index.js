/**
 * Middleware index file - exports all middleware functions
 * Based on UserManagement component requirements
 */

const { authenticateUser, basicAuth } = require('./auth');
const { 
  requirePermission: originalRequirePermission,
  requireAnyPermission: originalRequireAnyPermission
} = require('./permissions');
const {
  authenticateUser: roleBasedAuth,
  requireRole,
  requireRoleGroup,
  requirePermission,
  filterDataByRole,
  requireEvacuationCenterAccess,
  requireUserDataAccess,
  getRoleConfig,
  ROLE_CONFIGS
} = require('./roleBasedAccess');
const {
  requireUserManagementAccess,
  filterUsersByRole,
  requireEvacuationCenterPermission,
  requireRoleAssignmentPermission,
  requireAnyPermission
} = require('./enhancedPermissions');
const { authenticateMobileApp, generateApiKey } = require('./deviceAuth');

// Re-export all middleware functions
module.exports = {
  // Authentication
  authenticateUser,
  basicAuth,
  roleBasedAuth,
  
  // Role-based access control
  requireRole,
  requireRoleGroup,
  
  // Permissions (enhanced and original)
  requirePermission,
  originalRequirePermission,
  requireAnyPermission,
  originalRequireAnyPermission,
  
  // User Management specific
  requireUserManagementAccess,
  filterUsersByRole,
  filterDataByRole,
  requireUserDataAccess,
  
  // Evacuation Center specific
  requireEvacuationCenterAccess,
  requireEvacuationCenterPermission,
  
  // Role assignment
  requireRoleAssignmentPermission,
  
  // Mobile app authentication
  authenticateMobileApp,
  generateApiKey,
  
  // Utilities
  getRoleConfig,
  ROLE_CONFIGS
};