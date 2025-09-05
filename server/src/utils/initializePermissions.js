const { supabaseAdmin } = require('../config/supabase');

/**
 * Database initialization script for permissions
 * This sets up the role-permission mappings based on the UserManagement component
 */

// Define all permissions needed by the application
const PERMISSIONS = [
  { id: 1, permission_name: 'view_user_management', description: 'View user management interface' },
  { id: 2, permission_name: 'add_user', description: 'Create new users' },
  { id: 3, permission_name: 'update_user', description: 'Update existing users' },
  { id: 4, permission_name: 'delete_user', description: 'Delete users' },
  { id: 5, permission_name: 'manage_evacuation_centers', description: 'Manage evacuation centers' },
  { id: 6, permission_name: 'view_reports', description: 'View reports' },
  { id: 7, permission_name: 'manage_announcements', description: 'Manage announcements' },
  { id: 8, permission_name: 'view_dashboard', description: 'View dashboard' }
];

// Define roles (these should match your existing roles table)
const ROLES = [
  { id: 1, role_name: 'System Admin' },
  { id: 2, role_name: 'Barangay Official' },
  { id: 3, role_name: 'Regional Coordinator' },
  { id: 4, role_name: 'CSWDO' },
  { id: 5, role_name: 'Camp Manager' }
];

// Define role-permission mappings based on UserManagement component
const ROLE_PERMISSIONS = [
  // System Admin (Role 1) - Full access
  { role_id: 1, permission_id: 1 }, // view_user_management
  { role_id: 1, permission_id: 2 }, // add_user
  { role_id: 1, permission_id: 3 }, // update_user
  { role_id: 1, permission_id: 4 }, // delete_user
  { role_id: 1, permission_id: 5 }, // manage_evacuation_centers
  { role_id: 1, permission_id: 6 }, // view_reports
  { role_id: 1, permission_id: 7 }, // manage_announcements
  { role_id: 1, permission_id: 8 }, // view_dashboard

  // Barangay Official (Role 2) - Limited access
  { role_id: 2, permission_id: 1 }, // view_user_management
  { role_id: 2, permission_id: 2 }, // add_user
  { role_id: 2, permission_id: 3 }, // update_user
  { role_id: 2, permission_id: 6 }, // view_reports
  { role_id: 2, permission_id: 8 }, // view_dashboard

  // Regional Coordinator (Role 3) - Similar to Barangay Official
  { role_id: 3, permission_id: 1 }, // view_user_management
  { role_id: 3, permission_id: 2 }, // add_user
  { role_id: 3, permission_id: 3 }, // update_user
  { role_id: 3, permission_id: 6 }, // view_reports
  { role_id: 3, permission_id: 8 }, // view_dashboard

  // CSWDO (Role 4) - Full access including evacuation centers
  { role_id: 4, permission_id: 1 }, // view_user_management
  { role_id: 4, permission_id: 2 }, // add_user
  { role_id: 4, permission_id: 3 }, // update_user
  { role_id: 4, permission_id: 4 }, // delete_user
  { role_id: 4, permission_id: 5 }, // manage_evacuation_centers
  { role_id: 4, permission_id: 6 }, // view_reports
  { role_id: 4, permission_id: 8 }, // view_dashboard

  // Camp Manager (Role 5) - Similar to CSWDO
  { role_id: 5, permission_id: 1 }, // view_user_management
  { role_id: 5, permission_id: 2 }, // add_user
  { role_id: 5, permission_id: 3 }, // update_user
  { role_id: 5, permission_id: 4 }, // delete_user
  { role_id: 5, permission_id: 5 }, // manage_evacuation_centers
  { role_id: 5, permission_id: 6 }, // view_reports
  { role_id: 5, permission_id: 8 }, // view_dashboard
];

/**
 * Initialize permissions in the database
 */
const initializePermissions = async () => {
  try {
    console.log('🔄 Initializing permissions system...');

    // 1. Insert permissions (with conflict handling)
    console.log('📝 Setting up permissions...');
    for (const permission of PERMISSIONS) {
      const { error } = await supabaseAdmin
        .from('permissions')
        .upsert(permission, { onConflict: 'id' });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error inserting permission:', permission.permission_name, error);
      }
    }

    // 2. Insert roles (with conflict handling)
    console.log('👥 Setting up roles...');
    for (const role of ROLES) {
      const { error } = await supabaseAdmin
        .from('roles')
        .upsert(role, { onConflict: 'id' });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error inserting role:', role.role_name, error);
      }
    }

    // 3. Clear existing role-permissions and insert new ones
    console.log('🔗 Setting up role-permission mappings...');
    
    // Delete existing mappings
    const { error: deleteError } = await supabaseAdmin
      .from('role_permission')
      .delete()
      .neq('role_id', 0); // Delete all records

    if (deleteError) {
      console.warn('Warning clearing existing role-permissions:', deleteError.message);
    }

    // Insert new mappings
    const { error: insertError } = await supabaseAdmin
      .from('role_permission')
      .insert(ROLE_PERMISSIONS);

    if (insertError) {
      console.error('Error inserting role-permissions:', insertError);
      throw insertError;
    }

    console.log('✅ Permissions system initialized successfully!');
    
    // 4. Verify the setup
    await verifyPermissions();

  } catch (error) {
    console.error('❌ Failed to initialize permissions:', error);
    throw error;
  }
};

/**
 * Verify permissions setup
 */
const verifyPermissions = async () => {
  try {
    console.log('🔍 Verifying permissions setup...');

    // Check each role has correct permissions
    for (const role of ROLES) {
      const { data: rolePermissions, error } = await supabaseAdmin
        .from('role_permission')
        .select(`
          role_id,
          permissions (
            permission_name
          )
        `)
        .eq('role_id', role.id);

      if (error) {
        console.error(`Error checking permissions for role ${role.role_name}:`, error);
        continue;
      }

      const permissionNames = rolePermissions?.map(rp => rp.permissions?.permission_name) || [];
      console.log(`🔹 ${role.role_name} (ID: ${role.id}):`, permissionNames.join(', '));
    }

    console.log('✅ Permissions verification complete!');
  } catch (error) {
    console.error('❌ Permissions verification failed:', error);
  }
};

/**
 * Get user permissions for testing
 */
const getUserPermissions = async (userId) => {
  try {
    // Get user's role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('role_id, roles(role_name)')
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('User profile not found');
      return null;
    }

    // Get role permissions
    const { data: rolePermissions, error: permError } = await supabaseAdmin
      .from('role_permission')
      .select(`
        permissions (
          permission_name,
          description
        )
      `)
      .eq('role_id', userProfile.role_id);

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return null;
    }

    return {
      role: userProfile.roles?.role_name,
      role_id: userProfile.role_id,
      permissions: rolePermissions?.map(rp => ({
        name: rp.permissions?.permission_name,
        description: rp.permissions?.description
      })) || []
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
};

/**
 * Check if user has specific permission
 */
const checkUserPermission = async (userId, permissionName) => {
  try {
    const userPerms = await getUserPermissions(userId);
    if (!userPerms) return false;

    return userPerms.permissions.some(p => p.name === permissionName);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};

module.exports = {
  initializePermissions,
  verifyPermissions,
  getUserPermissions,
  checkUserPermission,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS
};
