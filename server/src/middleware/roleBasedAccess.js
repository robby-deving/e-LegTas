const { supabaseAdmin } = require('../config/supabase');

/**
 * Role-based access control middleware inspired by UserManagement component
 * Provides granular control over user access based on roles and permissions
 */

// Role configuration matching the frontend UserManagement component
const ROLE_CONFIGS = {
  SYSTEM_ADMIN_GROUP: {
    roles: [1],
    canSeeEvacCenter: true,
    canSelectRole: true,
    canManageEvacCenter: true,
    allowedRoleIds: [1, 2, 3, 4, 5], // Can see all users
    assignableRoleIds: [1, 2, 3, 4, 5], // Can assign any role
    permissions: ['view_user_management', 'add_user', 'update_user', 'delete_user', 'manage_evacuation_centers']
  },
  BARANGAY_GROUP: {
    roles: [2, 3],
    canSeeEvacCenter: false,
    canSelectRole: true,
    canManageEvacCenter: false,
    allowedRoleIds: [2, 3],
    assignableRoleIds: [2, 3], // Can only assign roles 2 & 3
    permissions: ['view_user_management', 'add_user', 'update_user']
  },
  CSWDO_GROUP: {
    roles: [4, 5],
    canSeeEvacCenter: true,
    canSelectRole: true,
    canManageEvacCenter: true,
    allowedRoleIds: [4, 5],
    assignableRoleIds: [4, 5], // Can only assign roles 4 & 5
    permissions: ['view_user_management', 'add_user', 'update_user', 'delete_user', 'manage_evacuation_centers']
  }
};

/**
 * Get role configuration for a specific role ID
 * @param {number} roleId - The role ID to get configuration for
 * @returns {Object|null} Role configuration or null if not found
 */
const getRoleConfig = (roleId) => {
  for (const [groupName, config] of Object.entries(ROLE_CONFIGS)) {
    if (config.roles.includes(roleId)) {
      return { groupName, ...config };
    }
  }
  return null;
};

/**
 * Authentication middleware - validates user and adds user info to request
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'];
    
    // Debug logging
    console.log('Auth middleware - Headers:', {
      authorization: authHeader ? 'Bearer [token]' : 'None',
      'x-user-id': userIdHeader || 'None'
    });
    
    // Check if we have a user ID directly from header (for testing/development)
    if (userIdHeader) {
      console.log('Using x-user-id header for auth:', userIdHeader);
      
      // Get user profile information
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .select(`
          id,
          user_id,
          role_id,
          is_active,
          roles (
            id,
            role_name
          )
        `)
        .eq('user_id', userIdHeader)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({ 
          message: 'User profile not found',
          error: profileError?.message || 'Profile does not exist'
        });
      }

      // Check if user is active
      if (!userProfile.is_active) {
        return res.status(403).json({ 
          message: 'User account is inactive',
          error: 'Account has been deactivated'
        });
      }

      req.user = { 
        id: userIdHeader,
        role_id: userProfile.role_id,
        role_name: userProfile.roles?.role_name,
        profile: userProfile
      };
      
      return next();
    }
    
    // Check for Authorization header with Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid Authorization header found');
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'No valid authorization header found'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if supabaseAdmin is properly initialized
    if (!supabaseAdmin || !supabaseAdmin.auth) {
      console.error('Supabase admin client not properly initialized');
      return res.status(500).json({ 
        message: 'Authentication service unavailable',
        error: 'Server configuration error'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        message: 'Invalid authentication token',
        error: error?.message || 'Token verification failed'
      });
    }

    // Get user profile information
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select(`
        id,
        user_id,
        role_id,
        is_active,
        roles (
          id,
          role_name
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ 
        message: 'User profile not found',
        error: profileError?.message || 'Profile does not exist'
      });
    }

    // Check if user is active
    if (!userProfile.is_active) {
      return res.status(403).json({ 
        message: 'User account is inactive',
        error: 'Account has been deactivated'
      });
    }

    req.user = { 
      ...user,
      role_id: userProfile.role_id,
      role_name: userProfile.roles?.role_name,
      profile: userProfile
    };
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {number|number[]} allowedRoles - Single role ID or array of role IDs
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user role information found'
        });
      }

      if (!roles.includes(req.user.role_id)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Access denied. Required roles: ${roles.join(', ')}`,
          userRole: req.user.role_id
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({ 
        message: 'Authorization failed',
        error: error.message
      });
    }
  };
};

/**
 * Role group-based authorization middleware
 * @param {string|string[]} allowedGroups - Single group name or array of group names
 */
const requireRoleGroup = (allowedGroups) => {
  const groups = Array.isArray(allowedGroups) ? allowedGroups : [allowedGroups];
  
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

      if (!groups.includes(roleConfig.groupName)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Access denied. Required groups: ${groups.join(', ')}`,
          userRole: req.user.role_id,
          userGroup: roleConfig.groupName
        });
      }

      // Add role configuration to request for downstream use
      req.roleConfig = roleConfig;
      
      next();
    } catch (error) {
      console.error('Role group authorization error:', error);
      return res.status(500).json({ 
        message: 'Authorization failed',
        error: error.message
      });
    }
  };
};

/**
 * Permission-based authorization middleware
 * @param {string} permissionName - The permission name to check
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user role information found'
        });
      }

      // Get role permissions from database
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', req.user.role_id);

      if (permError) {
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
          userRole: req.user.role_id,
          requiredPermission: permissionName
        });
      }

      // Add user permissions to request for downstream use
      req.userPermissions = rolePermissions.map(rp => rp.permissions?.permission_name);
      
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
 * Data filtering middleware based on role access
 * Filters data based on user's role configuration
 */
const filterDataByRole = () => {
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

      // Add filtering information to request
      req.dataFilter = {
        allowedRoleIds: roleConfig.allowedRoleIds,
        assignableRoleIds: roleConfig.assignableRoleIds,
        canManageEvacCenter: roleConfig.canManageEvacCenter,
        canSeeEvacCenter: roleConfig.canSeeEvacCenter,
        roleConfig: roleConfig
      };
      
      next();
    } catch (error) {
      console.error('Data filtering middleware error:', error);
      return res.status(500).json({ 
        message: 'Data filtering failed',
        error: error.message
      });
    }
  };
};

/**
 * Evacuation center access control middleware
 * Controls access to evacuation center functionality based on role
 */
const requireEvacuationCenterAccess = (action = 'view') => {
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

      // Check evacuation center access based on action
      let hasAccess = false;
      
      switch (action) {
        case 'view':
          hasAccess = roleConfig.canSeeEvacCenter;
          break;
        case 'manage':
          hasAccess = roleConfig.canManageEvacCenter;
          break;
        default:
          hasAccess = roleConfig.canSeeEvacCenter;
      }

      if (!hasAccess) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Cannot ${action} evacuation centers with current role`,
          userRole: req.user.role_id,
          userGroup: roleConfig.groupName
        });
      }
      
      next();
    } catch (error) {
      console.error('Evacuation center access middleware error:', error);
      return res.status(500).json({ 
        message: 'Evacuation center access check failed',
        error: error.message
      });
    }
  };
};

/**
 * User data access control middleware
 * Controls which users can be accessed based on role hierarchy
 */
const requireUserDataAccess = () => {
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

      // If there's a target user ID in params, check if current user can access it
      if (req.params.userId || req.params.id) {
        const targetUserId = req.params.userId || req.params.id;
        
        // Get target user's role
        const { data: targetUserProfile, error: targetError } = await supabaseAdmin
          .from('users_profile')
          .select('role_id')
          .eq('user_id', targetUserId)
          .single();

        if (targetError || !targetUserProfile) {
          return res.status(404).json({ 
            message: 'Target user not found',
            error: targetError?.message || 'User does not exist'
          });
        }

        // Check if current user can access target user based on role
        if (!roleConfig.allowedRoleIds.includes(targetUserProfile.role_id)) {
          return res.status(403).json({ 
            message: 'Insufficient permissions',
            error: 'Cannot access user with this role',
            userRole: req.user.role_id,
            targetUserRole: targetUserProfile.role_id
          });
        }
      }

      // Add access control information to request
      req.userAccess = {
        allowedRoleIds: roleConfig.allowedRoleIds,
        assignableRoleIds: roleConfig.assignableRoleIds,
        roleConfig: roleConfig
      };
      
      next();
    } catch (error) {
      console.error('User data access middleware error:', error);
      return res.status(500).json({ 
        message: 'User data access check failed',
        error: error.message
      });
    }
  };
};

module.exports = {
  authenticateUser,
  requireRole,
  requireRoleGroup,
  requirePermission,
  filterDataByRole,
  requireEvacuationCenterAccess,
  requireUserDataAccess,
  getRoleConfig,
  ROLE_CONFIGS
};
