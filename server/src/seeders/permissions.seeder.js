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

const permissions = [
    // Dashboard
    { permission_name: 'view_dashboard', label: 'View Main Dashboard City Wide', group: 'Dashboard' },
    { permission_name: 'view_dashboard_specific', label: 'View Dashboard Per Evacuation Center', group: 'Dashboard' },
    { permission_name: 'filter_dashboard_by_disaster', label: 'Filter Dashboard by Disaster', group: 'Dashboard' },
    { permission_name: 'filter_dashboard_by_date', label: 'Filter Dashboard by Date', group: 'Dashboard' },
    
    // Mapping
    { permission_name: 'view_map', label: 'View GIS Map of Evacuation Centers', group: 'Mapping' },
    
    // Evacuee Management
    { permission_name: 'view_evacuee_information', label: 'View Evacuee Information', group: 'Evacuee Management' },
    { permission_name: 'create_evacuee_information', label: 'Register Evacuee', group: 'Evacuee Management' },
    { permission_name: 'update_evacuee_information', label: 'Update Evacuee Information', group: 'Evacuee Management' },
    { permission_name: 'delete_evacuee_information', label: 'Delete Evacuee Information', group: 'Evacuee Management' },
    { permission_name: 'view_family_information', label: 'View Family Information', group: 'Evacuee Management' },
    { permission_name: 'create_family_information', label: 'Add Family Member', group: 'Evacuee Management' },
    { permission_name: 'update_family_information', label: 'Update Family Member Information', group: 'Evacuee Management' },
    { permission_name: 'delete_family_information', label: 'Delete Family Member Information', group: 'Evacuee Management' },
    
    // Disaster Management
    { permission_name: 'view_disaster', label: 'View Disaster Records', group: 'Disaster Management' },
    { permission_name: 'create_disaster', label: 'Record New Disaster', group: 'Disaster Management' },
    { permission_name: 'update_disaster', label: 'Update Disaster Information', group: 'Disaster Management' },
    { permission_name: 'delete_disaster', label: 'Delete Disaster Record', group: 'Disaster Management' },
    
    // Evacuation Center Management
    { permission_name: 'view_evacuation_centers', label: 'View Evacuation Centers', group: 'Evacuation Center Management' },
    { permission_name: 'create_evacuation_center', label: 'Add New Evacuation Center', group: 'Evacuation Center Management' },
    { permission_name: 'update_evacuation_center', label: 'Edit Evacuation Center Information', group: 'Evacuation Center Management' },
    { permission_name: 'delete_evacuation_center', label: 'Delete Evacuation Center', group: 'Evacuation Center Management' },
    
    // Reports
    { permission_name: 'view_reports', label: 'View Reports', group: 'Reports' },
    { permission_name: 'create_report', label: 'Generate New Report', group: 'Reports' },
    { permission_name: 'update_report', label: 'Edit Existing Report', group: 'Reports' },
    { permission_name: 'delete_report', label: 'Delete Report', group: 'Reports' },
    { permission_name: 'download_report', label: 'Download or Export Report', group: 'Reports' },
    
    // Announcements
    { permission_name: 'view_announcement_page', label: 'View Announcements Page', group: 'Announcements' },
    { permission_name: 'post_announcement', label: 'Post New Announcement', group: 'Announcements' },
    
    // User Management
    { permission_name: 'view_user_management', label: 'View User Management Page', group: 'User Management' },
    { permission_name: 'create_role', label: 'Create Role', group: 'User Management' },
    { permission_name: 'update_role', label: 'Update Role', group: 'User Management' },
    { permission_name: 'delete_role', label: 'Delete Role', group: 'User Management' },
    { permission_name: 'add_user', label: 'Add New User', group: 'User Management' },
    { permission_name: 'update_user', label: 'Update User Details', group: 'User Management' },
    { permission_name: 'delete_user', label: 'Delete User', group: 'User Management' },
    { permission_name: 'add_user_role', label: 'Assign Role to User', group: 'User Management' },
    { permission_name: 'add_user_permission', label: 'Assign Permission to User', group: 'User Management' },
    { permission_name: 'edit_user_permission', label: 'Edit User Permissions', group: 'User Management' },
    
    // Profile
    { permission_name: 'view_profile', label: 'View User Profile', group: 'Profile' },
    { permission_name: 'update_profile', label: 'Update Profile Information', group: 'Profile' },
    { permission_name: 'update_password', label: 'Change Account Password', group: 'Profile' },
];

const seedPermissions = async () => {
  try {
    console.log('Starting permissions seeding...');
    
    // Check if permissions already exist
    const { data: existingPermissions, error: fetchError } = await supabaseAdmin
      .from('permissions')
      .select('permission_name');
    
    if (fetchError) {
      console.error('Error checking existing permissions:', fetchError);
      return;
    }
    
    if (existingPermissions && existingPermissions.length > 0) {
      console.log(`Found ${existingPermissions.length} existing permissions. Skipping seeding.`);
      return;
    }
    
    console.log('No existing permissions found. Inserting permissions...');
    
    // Insert permissions with timestamps
    const permissionsWithTimestamps = permissions.map(perm => ({
      ...perm,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabaseAdmin
      .from('permissions')
      .insert(permissionsWithTimestamps)
      .select();
    
    if (error) {
      console.error('Error inserting permissions:', error);
      return;
    }
    
    console.log(`Successfully inserted ${data.length} permissions!`);
    console.log('Permissions seeding completed.');
    
  } catch (error) {
    console.error('Permissions seeding failed:', error);
  }
};

// Run the seeder
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('Seeding process completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedPermissions };
