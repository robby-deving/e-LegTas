const { supabaseAdmin } = require('../config/supabase');
const { getRoleConfig, ROLE_CONFIGS } = require('./roleBasedAccess');

/**
 * Enhanced permissions middleware based on UserManagement component
 * Provides granular permission checking with role-based filtering
 */

/**
 * Standard permission check middleware - uses database permissions
 * @param {string} permissionName - The permission name to check
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];
      
      if (!userId) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // Get user's role from request (set by auth middleware) or database
      let userRoleId = req.user?.role_id;
      
      if (!userRoleId) {
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('users_profile')
          .select('role_id')
          .eq('user_id', userId)
          .single();

        if (profileError || !userProfile) {
          return res.status(404).json({ 
            message: 'User profile not found',
            error: profileError?.message
          });
        }
        
        userRoleId = userProfile.role_id;
      }

      // Get role permissions from database
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', userRoleId)
        .is('deleted_at', null);

      if (permError) {
        console.error('Database permission check error:', permError);
        return res.status(500).json({ 
          message: 'Error fetching permissions',
          error: permError.message
        });
      }

      // Check if user has the required permission
      const hasPermission = rolePermissions?.some(rp => 
        rp.permissions?.permission_name === permissionName
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Permission '${permissionName}' required`,
          userRole: userRoleId,
          requiredPermission: permissionName,
          availablePermissions: rolePermissions?.map(rp => rp.permissions?.permission_name) || []
        });
      }

      // Add user info to request for downstream use
      req.userPermissions = rolePermissions.map(rp => rp.permissions?.permission_name);
      req.userRole = userRoleId;
      
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ 
        message: 'Permission check failed',
        error: error.message
      });
    }
  };
};

/**
 * User management specific permission middleware
 * Uses both database permissions and role configuration for redundancy
 */
const requireUserManagementAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user role information found'
        });
      }

      const userId = req.user.id;
      const userRoleId = req.user.role_id;

      // Get role configuration for fallback
      const roleConfig = getRoleConfig(userRoleId);
      
      // Get database permissions
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', userRoleId);

      if (permError) {
        console.error('Database permission error:', permError);
        // If database fails, fall back to role configuration
        if (!roleConfig) {
          return res.status(500).json({ 
            message: 'Permission system unavailable',
            error: 'Cannot verify permissions'
          });
        }
      }

      // Check permissions based on action
      let hasPermission = false;
      let requiredPermission = '';

      switch (action) {
        case 'view':
          requiredPermission = 'view_user_management';
          break;
        case 'add':
          requiredPermission = 'add_user';
          break;
        case 'update':
          requiredPermission = 'update_user';
          break;
        case 'delete':
          requiredPermission = 'delete_user';
          break;
        default:
          requiredPermission = 'view_user_management';
      }

      // Check database permissions only (no role-config fallback)
      if (rolePermissions && rolePermissions.length > 0) {
        hasPermission = rolePermissions.some(rp => rp.permissions?.permission_name === requiredPermission);
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Permission '${requiredPermission}' required for ${action} action`,
          userRole: userRoleId,
          userGroup: roleConfig?.groupName,
          requiredPermission: requiredPermission
        });
      }

      // Add role configuration and permissions to request
      req.roleConfig = roleConfig;
      req.userAccess = {
        allowedRoleIds: roleConfig?.allowedRoleIds || [],
        assignableRoleIds: roleConfig?.assignableRoleIds || [],
        canManageEvacCenter: roleConfig?.canManageEvacCenter || false,
        canSeeEvacCenter: roleConfig?.canSeeEvacCenter || false
      };
      req.userPermissions = rolePermissions?.map(rp => rp.permissions?.permission_name) || [];
      
      next();
    } catch (error) {
      console.error('User management access middleware error:', error);
      return res.status(500).json({ 
        message: 'User management access check failed',
        error: error.message
      });
    }
  };
};

/**
 * Role-specific user filtering middleware
 * Ensures users can only access data they're authorized to see
 */
const filterUsersByRole = () => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user role information found'
        });
      }

      const roleConfig = getRoleConfig(req.user.role_id);

      // If role isn't in ROLE_CONFIGS, restrict to same-role users only
      if (!roleConfig) {
        const originalJson = res.json;
        res.json = function(data) {
          if (data && data.users && Array.isArray(data.users)) {
            data.users = data.users.filter(user => {
              const userRoleId = user.users_profile?.role_id || user.role_id;
              return userRoleId === req.user.role_id;
            });
          }
          return originalJson.call(this, data);
        };
        req.userFilter = {
          allowedRoleIds: [req.user.role_id],
          roleConfig: null
        };
        return next();
      }

      // Add filter function to response
      const originalJson = res.json;
      res.json = function(data) {
        if (data && data.users && Array.isArray(data.users)) {
          // If allowedRoleIds is 'all', do not filter; otherwise filter by list
          if (Array.isArray(roleConfig.allowedRoleIds)) {
            data.users = data.users.filter(user => {
              const userRoleId = user.users_profile?.role_id || user.role_id;
              return roleConfig.allowedRoleIds.includes(userRoleId);
            });
          }
        }
        return originalJson.call(this, data);
      };

      // Add filtering information to request
      req.userFilter = {
        allowedRoleIds: roleConfig.allowedRoleIds,
        roleConfig: roleConfig
      };
      
      next();
    } catch (error) {
      console.error('User filtering middleware error:', error);
      return res.status(500).json({ 
        message: 'User filtering failed',
        error: error.message
      });
    }
  };
};

/**
 * Evacuation center management permission middleware
 */
const requireEvacuationCenterPermission = (action = 'view') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user role information found'
        });
      }

      const roleConfig = getRoleConfig(req.user.role_id);
      
      if (!roleConfig) {
        return res.status(403).json({ 
          message: 'Invalid role configuration',
          error: 'User role is not properly configured',
          userRole: req.user.role_id
        });
      }

      let hasPermission = false;
      
      switch (action) {
        case 'view':
          hasPermission = roleConfig.canSeeEvacCenter;
          break;
        case 'manage':
        case 'assign':
        case 'update':
          hasPermission = roleConfig.canManageEvacCenter;
          break;
        default:
          hasPermission = roleConfig.canSeeEvacCenter;
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Cannot ${action} evacuation centers with current role`,
          userRole: req.user.role_id,
          userGroup: roleConfig.groupName
        });
      }
      
      next();
    } catch (error) {
      console.error('Evacuation center permission middleware error:', error);
      return res.status(500).json({ 
        message: 'Evacuation center permission check failed',
        error: error.message
      });
    }
  };
};

/**
 * Role assignment permission middleware
 * Controls which roles a user can assign to others
 */
const requireRoleAssignmentPermission = () => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user role information found'
        });
      }

      const roleConfig = getRoleConfig(req.user.role_id);
      
      if (!roleConfig) {
        return res.status(403).json({ 
          message: 'Invalid role configuration',
          error: 'User role is not properly configured',
          userRole: req.user.role_id
        });
      }

      // Check if trying to assign a role
      const targetRoleId = req.body?.roleId || req.body?.role_id;
      
      if (targetRoleId) {
        const assignable = roleConfig.assignableRoleIds;
        // If assignable is 'all', allow; otherwise ensure the role ID is whitelisted
        if (Array.isArray(assignable) && !assignable.includes(parseInt(targetRoleId))) {
          return res.status(403).json({ 
            message: 'Insufficient permissions',
            error: `Cannot assign role ${targetRoleId}. Allowed roles: ${roleConfig.assignableRoleIds.join(', ')}`,
            userRole: req.user.role_id,
            targetRole: targetRoleId,
            allowedRoles: roleConfig.assignableRoleIds
          });
        }
      }

      req.roleAssignmentConfig = {
        assignableRoleIds: roleConfig.assignableRoleIds,
        canSelectRole: roleConfig.canSelectRole
      };
      
      next();
    } catch (error) {
      console.error('Role assignment permission middleware error:', error);
      return res.status(500).json({ 
        message: 'Role assignment permission check failed',
        error: error.message
      });
    }
  };
};

/**
 * Multiple permissions check middleware
 * @param {string[]} permissionNames - Array of permission names (user needs ANY of these)
 */
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];
      
      if (!userId) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // Get user's role
      let userRoleId = req.user?.role_id;
      
      if (!userRoleId) {
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('users_profile')
          .select('role_id')
          .eq('user_id', userId)
          .single();

        if (profileError || !userProfile) {
          return res.status(404).json({ 
            message: 'User profile not found',
            error: profileError?.message
          });
        }
        
        userRoleId = userProfile.role_id;
      }

      // Get role permissions
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', userRoleId);

      if (permError) {
        return res.status(500).json({ 
          message: 'Error fetching permissions',
          error: permError.message
        });
      }

      // Check if user has any of the required permissions
      const userPermissions = rolePermissions?.map(rp => rp.permissions?.permission_name) || [];
      const hasAnyPermission = permissionNames.some(perm => userPermissions.includes(perm));

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `One of these permissions required: ${permissionNames.join(', ')}`,
          userRole: userRoleId,
          requiredPermissions: permissionNames
        });
      }

      req.userPermissions = userPermissions;
      req.userRole = userRoleId;
      
      next();
    } catch (error) {
      console.error('Any permission middleware error:', error);
      return res.status(500).json({ 
        message: 'Permission check failed',
        error: error.message
      });
    }
  };
};

module.exports = {
  requirePermission,
  requireUserManagementAccess,
  filterUsersByRole,
  requireEvacuationCenterPermission,
  requireRoleAssignmentPermission,
  requireAnyPermission
};
