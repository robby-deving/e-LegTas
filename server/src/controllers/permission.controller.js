const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get all permissions grouped by category
const getPermissions = async (req, res) => {
  try {
    const { data: permissions, error } = await supabaseAdmin
      .from('permissions')
      .select('*')
      .order('permission_name');

    if (error) {
      logger.error('Error fetching permissions:', error);
      return res.status(500).json({ message: 'Failed to fetch permissions' });
    }

    res.status(200).json({ permissions });

  } catch (error) {
    logger.error('Get permissions error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get permissions for a specific role
const getRolePermissions = async (req, res) => {
  try {
    // Use validated params from middleware if available
    const roleId = req.validatedParams?.roleId || req.params.roleId;

    if (!roleId || isNaN(parseInt(roleId))) {
      return res.status(400).json({ 
        message: 'Invalid role ID provided',
        error: 'Role ID must be a valid number'
      });
    }

    const { data: rolePermissions, error } = await supabaseAdmin
      .from('role_permission')
      .select(`
        id,
        role_id,
        permission_id,
        permissions!permission_id (
          id,
          permission_name,
          label,
          description
        )
      `)
      .eq('role_id', parseInt(roleId))
      .is('deleted_at', null);

    if (error) {
      logger.error('Error fetching role permissions:', { error: error.message, stack: error.stack });
      return res.status(500).json({ 
        message: 'Failed to fetch role permissions',
        error: error.message 
      });
    }

    // Transform the data to return just the permissions
    const permissions = rolePermissions?.map(rp => rp.permissions) || [];

    res.status(200).json({ 
      roleId: parseInt(roleId),
      permissions 
    });

  } catch (error) {
    logger.error('Get role permissions error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update permissions for a role
const updateRolePermissions = async (req, res) => {
  try {
    // Use validated params and body from middleware if available
    const roleId = req.validatedParams?.roleId || req.params.roleId;
    const validatedData = req.validatedBody || req.body;
    const permissionIds = validatedData.permissionIds;

    logger.debug('Updating role permissions for role:', { roleId });
    logger.debug('Received permission IDs:', { permissionIds });

    if (!roleId || isNaN(parseInt(roleId))) {
      return res.status(400).json({ 
        message: 'Invalid role ID provided',
        error: 'Role ID must be a valid number'
      });
    }

    if (!Array.isArray(permissionIds)) {
      logger.warn('Invalid permission IDs format:', { permissionIds });
      return res.status(400).json({ 
        message: 'Permission IDs must be an array'
      });
    }

    const roleIdInt = parseInt(roleId);

    // Get current active permissions for this role
    const { data: currentPermissions, error: fetchError } = await supabaseAdmin
      .from('role_permission')
      .select('permission_id')
      .eq('role_id', roleIdInt)
      .is('deleted_at', null);

    if (fetchError) {
      logger.error('Error fetching current permissions:', { error: fetchError.message, stack: fetchError.stack });
      return res.status(500).json({ 
        message: 'Failed to fetch current permissions',
        error: fetchError.message
      });
    }

    const currentPermissionIds = (currentPermissions || []).map(p => p.permission_id);
    const newPermissionIds = permissionIds.map(id => parseInt(id));

    logger.debug('Current active permissions:', { currentPermissionIds });
    logger.debug('New permissions:', { newPermissionIds });

    // Find permissions to remove (soft delete)
    const permissionsToRemove = currentPermissionIds.filter(id => !newPermissionIds.includes(id));
    logger.debug('Permissions to remove:', { permissionsToRemove });

    // Find permissions to add
    const permissionsToAdd = newPermissionIds.filter(id => !currentPermissionIds.includes(id));
    logger.debug('Permissions to add:', { permissionsToAdd });

    // Remove permissions that are no longer selected
    if (permissionsToRemove.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('role_permission')
        .update({ deleted_at: new Date().toISOString() })
        .eq('role_id', roleIdInt)
        .in('permission_id', permissionsToRemove)
        .is('deleted_at', null);

      if (deleteError) {
        logger.error('Error removing permissions:', { error: deleteError.message, stack: deleteError.stack });
        return res.status(500).json({ 
          message: 'Failed to remove permissions',
          error: deleteError.message
        });
      }
    }

    // Add new permissions (restore soft-deleted ones or create new ones)
    if (permissionsToAdd.length > 0) {
      for (const permissionId of permissionsToAdd) {
        // First, check if this permission was previously soft-deleted
        const { data: existingRecord, error: checkError } = await supabaseAdmin
          .from('role_permission')
          .select('id, deleted_at')
          .eq('role_id', roleIdInt)
          .eq('permission_id', permissionId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new permissions
          logger.error('Error checking existing permission record:', { error: checkError.message, stack: checkError.stack });
          return res.status(500).json({ 
            message: 'Failed to check existing permissions',
            error: checkError.message
          });
        }

        if (existingRecord && existingRecord.deleted_at) {
          // Restore soft-deleted permission by setting deleted_at to null
          logger.debug(`Restoring soft-deleted permission: role ${roleIdInt}, permission ${permissionId}`);
          
          const { error: restoreError } = await supabaseAdmin
            .from('role_permission')
            .update({ deleted_at: null })
            .eq('role_id', roleIdInt)
            .eq('permission_id', permissionId);

          if (restoreError) {
            logger.error('Error restoring soft-deleted permission:', { error: restoreError.message, stack: restoreError.stack });
            return res.status(500).json({ 
              message: 'Failed to restore permission',
              error: restoreError.message
            });
          }
        } else if (!existingRecord) {
          // Create new permission record
          logger.debug(`Creating new permission: role ${roleIdInt}, permission ${permissionId}`);
          
          const { error: insertError } = await supabaseAdmin
            .from('role_permission')
            .insert({
              role_id: roleIdInt,
              permission_id: permissionId
            });

          if (insertError) {
            logger.error('Error inserting new role permission:', { error: insertError.message, stack: insertError.stack });
            return res.status(500).json({ 
              message: 'Failed to add new permission',
              error: insertError.message
            });
          }
        }
        // If existingRecord exists but deleted_at is null, the permission is already active - skip
      }
    }

    res.status(200).json({ 
      message: 'Role permissions updated successfully',
      roleId: roleIdInt,
      permissionCount: newPermissionIds.length,
      added: permissionsToAdd.length,
      removed: permissionsToRemove.length
    });

  } catch (error) {
    logger.error('Update role permissions error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get permissions for a user based on their role
const getUserPermissions = async (req, res) => {
  try {
    // Use validated params from middleware if available
    const userId = req.validatedParams?.userId || req.params.userId;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ 
        message: 'Invalid user ID provided',
        error: 'User ID must be a valid number'
      });
    }

    // Get user's role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        users_profile!user_profile_id (
          role_id
        )
      `)
      .eq('id', parseInt(userId))
      .is('deleted_at', null)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roleId = user.users_profile?.role_id;
    if (!roleId) {
      return res.status(404).json({ message: 'User role not found' });
    }

    // Get role permissions
    const { data: rolePermissions, error: permError } = await supabaseAdmin
      .from('role_permission')
      .select(`
        permissions!permission_id (
          id,
          permission_name,
          label,
          description
        )
      `)
      .eq('role_id', roleId)
      .is('deleted_at', null);

    if (permError) {
      logger.error('Error fetching user permissions:', { error: permError.message, stack: permError.stack });
      return res.status(500).json({ 
        message: 'Failed to fetch user permissions',
        error: permError.message 
      });
    }

    const permissions = rolePermissions?.map(rp => rp.permissions) || [];

    res.status(200).json({ 
      userId: parseInt(userId),
      roleId,
      permissions 
    });

  } catch (error) {
    logger.error('Get user permissions error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions
};
