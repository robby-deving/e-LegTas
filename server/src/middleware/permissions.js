const { supabaseAdmin } = require('../config/supabase');

/**
 * Middleware to check if user has specific permission
 * @param {string} permissionName - The permission name to check (e.g., 'view_user_management')
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Get user from auth middleware (assuming it sets req.user)
      const userUuid = req.user?.uuid || req.headers['x-user-id'];
      
      if (!userUuid) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // Get user's role from users_profile using UUID
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .select('role_id')
        .eq('user_id', userUuid)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({ 
          message: 'User profile not found',
          error: profileError?.message
        });
      }

      // System Admin bypass for selected permissions
      const adminBypass = new Set([
        'view_user_management',
        'create_role',
        'update_role',
        'delete_role',
      ]);
      if (userProfile.role_id === 1 && adminBypass.has(permissionName)) {
        req.userRole = userProfile.role_id;
        return next();
      }

      // Get role permissions
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', userProfile.role_id)
        .is('deleted_at', null);

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
          userRole: userProfile.role_id,
          requiredPermission: permissionName
        });
      }

      // Add user info to request for downstream use
      req.userPermissions = rolePermissions.map(rp => rp.permissions?.permission_name);
      req.userRole = userProfile.role_id;
      
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
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissionNames - Array of permission names
 */
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userUuid = req.user?.uuid || req.headers['x-user-id'];
      
      if (!userUuid) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // Get user's role from users_profile using UUID
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .select('role_id')
        .eq('user_id', userUuid)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({ 
          message: 'User profile not found',
          error: profileError?.message
        });
      }

      // Get role permissions
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', userProfile.role_id)
        .is('deleted_at', null);

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
          userRole: userProfile.role_id,
          requiredPermissions: permissionNames
        });
      }

      req.userPermissions = userPermissions;
      req.userRole = userProfile.role_id;
      
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
 * Middleware to check if user has all specified permissions
 * @param {string[]} permissionNames - Array of permission names
 */
const requireAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userUuid = req.user?.uuid || req.headers['x-user-id'];
      
      if (!userUuid) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user ID found in request'
        });
      }

      // Get user's role from users_profile using UUID
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .select('role_id')
        .eq('user_id', userUuid)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({ 
          message: 'User profile not found',
          error: profileError?.message
        });
      }

      // Get role permissions
      const { data: rolePermissions, error: permError } = await supabaseAdmin
        .from('role_permission')
        .select(`
          permissions (
            permission_name
          )
        `)
        .eq('role_id', userProfile.role_id)
        .is('deleted_at', null);

      if (permError) {
        return res.status(500).json({ 
          message: 'Error fetching permissions',
          error: permError.message
        });
      }

      // Check if user has all required permissions
      const userPermissions = rolePermissions?.map(rp => rp.permissions?.permission_name) || [];
      const hasAllPermissions = permissionNames.every(perm => userPermissions.includes(perm));

      if (!hasAllPermissions) {
        const missingPermissions = permissionNames.filter(perm => !userPermissions.includes(perm));
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          error: `Missing permissions: ${missingPermissions.join(', ')}`,
          userRole: userProfile.role_id,
          missingPermissions
        });
      }

      req.userPermissions = userPermissions;
      req.userRole = userProfile.role_id;
      
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
 * Helper middleware to attach user permissions to request without blocking
 */
const attachPermissions = async (req, res, next) => {
  try {
    const userUuid = req.user?.uuid || req.headers['x-user-id'];
    
    if (!userUuid) {
      return next();
    }

    // Get user's role from users_profile using UUID
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('role_id')
      .eq('user_id', userUuid)
      .single();

    if (profileError || !userProfile) {
      return next();
    }

    // Get role permissions
    const { data: rolePermissions, error: permError } = await supabaseAdmin
      .from('role_permission')
      .select(`
        permissions (
          permission_name
        )
      `)
      .eq('role_id', userProfile.role_id)
      .is('deleted_at', null);

    if (!permError && rolePermissions) {
      req.userPermissions = rolePermissions.map(rp => rp.permissions?.permission_name);
      req.userRole = userProfile.role_id;
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
  getUserPermissions
};
