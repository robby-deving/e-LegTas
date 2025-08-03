const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

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
      console.error('Error fetching permissions:', error);
      return res.status(500).json({ message: 'Failed to fetch permissions' });
    }

    res.status(200).json({ permissions });

  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get permissions for a specific role
const getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;

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
          label
        )
      `)
      .eq('role_id', parseInt(roleId))
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching role permissions:', error);
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
    console.error('Get role permissions error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update permissions for a role
const updateRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!roleId || isNaN(parseInt(roleId))) {
      return res.status(400).json({ 
        message: 'Invalid role ID provided',
        error: 'Role ID must be a valid number'
      });
    }

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ 
        message: 'Permission IDs must be an array'
      });
    }

    const roleIdInt = parseInt(roleId);

    // First, soft delete all existing permissions for this role
    const { error: deleteError } = await supabaseAdmin
      .from('role_permission')
      .update({ deleted_at: new Date().toISOString() })
      .eq('role_id', roleIdInt);

    if (deleteError) {
      console.error('Error deleting existing role permissions:', deleteError);
      return res.status(500).json({ 
        message: 'Failed to update role permissions',
        error: deleteError.message
      });
    }

    // Then, insert new permissions
    if (permissionIds.length > 0) {
      const newRolePermissions = permissionIds.map(permissionId => ({
        role_id: roleIdInt,
        permission_id: parseInt(permissionId),
        deleted_at: null
      }));

      const { error: insertError } = await supabaseAdmin
        .from('role_permission')
        .insert(newRolePermissions);

      if (insertError) {
        console.error('Error inserting new role permissions:', insertError);
        return res.status(500).json({ 
          message: 'Failed to update role permissions',
          error: insertError.message
        });
      }
    }

    res.status(200).json({ 
      message: 'Role permissions updated successfully',
      roleId: roleIdInt,
      permissionCount: permissionIds.length
    });

  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get permissions for a user based on their role
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

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
          label
        )
      `)
      .eq('role_id', roleId)
      .is('deleted_at', null);

    if (permError) {
      console.error('Error fetching user permissions:', permError);
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
    console.error('Get user permissions error:', error);
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
