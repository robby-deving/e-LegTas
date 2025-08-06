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
  
  // Utilities
  getRoleConfig,
  ROLE_CONFIGS
};