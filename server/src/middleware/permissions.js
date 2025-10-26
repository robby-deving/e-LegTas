const { supabaseAdmin } = require('../config/supabase');
const { LRUCache } = require('lru-cache');

// LRU Cache for role permissions
// Cache key: role_${roleId}
// Cache value: Array of permission names
const permissionsCache = new LRUCache({
  max: 100, // Maximum number of roles to cache
  ttl: 5 * 60 * 1000, // 5 minutes TTL (in milliseconds)
  updateAgeOnGet: true, // Reset TTL on access
  updateAgeOnHas: false,
});

/**
 * Get role permissions from cache or database
 * @param {number} roleId - The role ID
 * @returns {Promise<string[]>} Array of permission names
 */
const getRolePermissions = async (roleId) => {
  const cacheKey = `role_${roleId}`;
  
  // Check cache first
  const cachedPermissions = permissionsCache.get(cacheKey);
  if (cachedPermissions) {
    return cachedPermissions;
  }

  // Cache miss - query database
  const { data: rolePermissions, error: permError } = await supabaseAdmin
    .from('role_permission')
    .select(`
      permissions (
        permission_name
      )
    `)
    .eq('role_id', roleId)
    .is('deleted_at', null);

  if (permError) {
    throw new Error(`Error fetching permissions: ${permError.message}`);
  }

  // Extract permission names
  const permissions = rolePermissions?.map(rp => rp.permissions?.permission_name).filter(Boolean) || [];
  
  // Cache the result
  permissionsCache.set(cacheKey, permissions);
  
  return permissions;
};

/**
 * Invalidate permissions cache for a specific role
 * Call this when role permissions are updated
 * @param {number} roleId - The role ID to invalidate (optional - clears all if not provided)
 */
const invalidatePermissionsCache = (roleId = null) => {
  if (roleId) {
    const cacheKey = `role_${roleId}`;
    permissionsCache.delete(cacheKey);
    console.log(`Invalidated permissions cache for role ${roleId}`);
  } else {
    permissionsCache.clear();
    console.log('Cleared all permissions cache');
  }
};

/**
 * Optimized middleware to check if user has specific permission
 * Uses role_id from JWT claims (set by authenticateUser middleware)
 * @param {string} permissionName - The permission name to check (e.g., 'view_user_management')
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Get role_id from req.user (set by authenticateUser middleware with custom claims)
      const roleId = req.user?.role_id;
      const userUuid = req.user?.uuid || req.headers['x-user-id'];
      
      if (!userUuid) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // If role_id is not available (legacy fallback)
      if (!roleId) {
        console.warn('Role ID not found in req.user. Ensure authenticateUser middleware is used before permission checks.');
        return res.status(500).json({ 
          message: 'Permission check failed',
          error: 'User role information not available'
        });
      }

      // System Admin bypass for selected permissions
      const adminBypass = new Set([
        'view_user_management',
        'create_role',
        'update_role',
        'delete_role',
      ]);
      if (roleId === 1 && adminBypass.has(permissionName)) {
        req.userRole = roleId;
        return next();
      }

      // Get role permissions from cache or database
      const userPermissions = await getRolePermissions(roleId);

      // Check if user has the required permission
      const hasPermission = userPermissions.includes(permissionName);

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Permission '${permissionName}' required`,
          userRole: roleId,
          requiredPermission: permissionName
        });
      }

      // Add user info to request for downstream use
      req.userPermissions = userPermissions;
      req.userRole = roleId;
      
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
 * Optimized middleware to check if user has any of the specified permissions
 * Uses role_id from JWT claims (set by authenticateUser middleware)
 * @param {string[]} permissionNames - Array of permission names
 */
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      // Get role_id from req.user (set by authenticateUser middleware with custom claims)
      const roleId = req.user?.role_id;
      const userUuid = req.user?.uuid || req.headers['x-user-id'];
      
      if (!userUuid) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // If role_id is not available (legacy fallback)
      if (!roleId) {
        console.warn('Role ID not found in req.user. Ensure authenticateUser middleware is used before permission checks.');
        return res.status(500).json({ 
          message: 'Permission check failed',
          error: 'User role information not available'
        });
      }

      // Get role permissions from cache or database
      const userPermissions = await getRolePermissions(roleId);

      // Check if user has any of the required permissions
      const hasAnyPermission = permissionNames.some(perm => userPermissions.includes(perm));

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `One of these permissions required: ${permissionNames.join(', ')}`,
          userRole: roleId,
          requiredPermissions: permissionNames
        });
      }

      req.userPermissions = userPermissions;
      req.userRole = roleId;
      
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
 * Optimized middleware to check if user has all specified permissions
 * Uses role_id from JWT claims (set by authenticateUser middleware)
 * @param {string[]} permissionNames - Array of permission names
 */
const requireAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      // Get role_id from req.user (set by authenticateUser middleware with custom claims)
      const roleId = req.user?.role_id;
      const userUuid = req.user?.uuid || req.headers['x-user-id'];
      
      if (!userUuid) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // If role_id is not available (legacy fallback)
      if (!roleId) {
        console.warn('Role ID not found in req.user. Ensure authenticateUser middleware is used before permission checks.');
        return res.status(500).json({ 
          message: 'Permission check failed',
          error: 'User role information not available'
        });
      }

      // Get role permissions from cache or database
      const userPermissions = await getRolePermissions(roleId);

      // Check if user has all required permissions
      const hasAllPermissions = permissionNames.every(perm => userPermissions.includes(perm));

      if (!hasAllPermissions) {
        const missingPermissions = permissionNames.filter(perm => !userPermissions.includes(perm));
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Missing permissions: ${missingPermissions.join(', ')}`,
          userRole: roleId,
          missingPermissions
        });
      }

      req.userPermissions = userPermissions;
      req.userRole = roleId;
      
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
 * Optimized helper middleware to attach user permissions to request without blocking
 * Uses role_id from JWT claims (set by authenticateUser middleware)
 */
const attachPermissions = async (req, res, next) => {
  try {
    // Get role_id from req.user (set by authenticateUser middleware with custom claims)
    const roleId = req.user?.role_id;
    const userUuid = req.user?.uuid || req.headers['x-user-id'];
    
    if (!userUuid || !roleId) {
      return next();
    }

    // Get role permissions from cache or database
    const userPermissions = await getRolePermissions(roleId);
    
    if (userPermissions) {
      req.userPermissions = userPermissions;
      req.userRole = roleId;
    }
    
    next();
  } catch (error) {
    console.error('Attach permissions error:', error);
    next(); // Continue even if permission attachment fails
  }
};

/**
 * Get user permissions (for use in controllers)
 * @param {string} userId - User UUID from Supabase Auth (not bigint ID)
 */
const getUserPermissions = async (userUuid) => {
  try {
    // Get user's role from users_profile using UUID
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('role_id')
      .eq('user_id', userUuid)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // Get role permissions
    const { data: rolePermissions, error: permError } = await supabaseAdmin
      .from('role_permission')
      .select(`
        permissions (
          permission_name,
          label
        )
      `)
      .eq('role_id', userProfile.role_id)
      .is('deleted_at', null);

    if (permError) {
      throw new Error('Error fetching permissions');
    }

    return {
      roleId: userProfile.role_id,
      permissions: rolePermissions?.map(rp => rp.permissions) || []
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  attachPermissions,
  getUserPermissions,
  invalidatePermissionsCache, // Export for use when permissions are updated
  getRolePermissions // Export for direct use in controllers if needed
};
