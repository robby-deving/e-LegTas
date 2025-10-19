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
  { permission_name: 'view_dashboard', label: 'View Main Dashboard City Wide', group: 'Dashboard', description: 'See aggregated city-wide statistics and metrics on the main dashboard.' },
  { permission_name: 'view_dashboard_specific', label: 'View Dashboard Per Evacuation Center', group: 'Dashboard', description: 'View dashboard data scoped to a specific evacuation center.' },
  { permission_name: 'filter_dashboard_by_disaster', label: 'Filter Dashboard by Disaster', group: 'Dashboard', description: 'Filter dashboard metrics by a selected disaster event.' },
  { permission_name: 'filter_dashboard_by_date', label: 'Filter Dashboard by Date', group: 'Dashboard', description: 'Filter dashboard metrics by a date range.' },
    
    // Mapping
  { permission_name: 'view_map', label: 'View GIS Map of Evacuation Centers', group: 'Mapping', description: 'Access the interactive GIS map showing evacuation centers and markers.' },
    
    // Evacuee Management
  { permission_name: 'view_evacuee_information', label: 'View Evacuee Information', group: 'Evacuee Management', description: 'View individual evacuee records and registration details.' },
  { permission_name: 'create_evacuee_information', label: 'Register Evacuee', group: 'Evacuee Management', description: 'Register a new evacuee into an evacuation center.' },
  { permission_name: 'update_evacuee_information', label: 'Update Evacuee Information', group: 'Evacuee Management', description: 'Edit an existing evacuee record.' },
  { permission_name: 'delete_evacuee_information', label: 'Delete Evacuee Information', group: 'Evacuee Management', description: 'Permanently remove an evacuee record.' },
  { permission_name: 'view_family_information', label: 'View Family Information', group: 'Evacuee Management', description: 'View members belonging to a family/group registration.' },
  { permission_name: 'create_family_information', label: 'Add Family Member', group: 'Evacuee Management', description: 'Add a member to an existing family registration.' },
  { permission_name: 'update_family_information', label: 'Update Family Member Information', group: 'Evacuee Management', description: 'Edit a family member\'s details.' },
  { permission_name: 'delete_family_information', label: 'Delete Family Member Information', group: 'Evacuee Management', description: 'Remove a family member from a registration.' },
    
    // Disaster Management
  { permission_name: 'view_disaster', label: 'View Disaster Records', group: 'Disaster Management', description: 'View disaster events and their details.' },
  { permission_name: 'create_disaster', label: 'Record New Disaster', group: 'Disaster Management', description: 'Create a new disaster event record.' },
  { permission_name: 'update_disaster', label: 'Update Disaster Information', group: 'Disaster Management', description: 'Edit details of an existing disaster event.' },
  { permission_name: 'delete_disaster', label: 'Delete Disaster Record', group: 'Disaster Management', description: 'Remove a disaster event from the system.' },
    
    // Evacuation Center Management
  { permission_name: 'view_evacuation_centers', label: 'View Evacuation Centers', group: 'Evacuation Center Management', description: 'Browse and search evacuation center records.' },
  { permission_name: 'create_evacuation_center', label: 'Add New Evacuation Center', group: 'Evacuation Center Management', description: 'Create a new evacuation center entry.' },
  { permission_name: 'update_evacuation_center', label: 'Edit Evacuation Center Information', group: 'Evacuation Center Management', description: 'Update details for an existing evacuation center.' },
  { permission_name: 'delete_evacuation_center', label: 'Delete Evacuation Center', group: 'Evacuation Center Management', description: 'Remove an evacuation center from the registry.' },
    
    // Reports
  { permission_name: 'view_reports', label: 'View Reports', group: 'Reports', description: 'Open and inspect generated reports.' },
  { permission_name: 'create_report', label: 'Generate New Report', group: 'Reports', description: 'Generate new reports from the selected data.' },
  { permission_name: 'update_report', label: 'Edit Existing Report', group: 'Reports', description: 'Modify the parameters or contents of a report.' },
  { permission_name: 'delete_report', label: 'Delete Report', group: 'Reports', description: 'Delete a generated report.' },
  { permission_name: 'download_report', label: 'Download or Export Report', group: 'Reports', description: 'Export a report to CSV or PDF.' },
    
    // Announcements
  { permission_name: 'view_announcement_page', label: 'View Announcements Page', group: 'Announcements', description: 'Access the announcements listing and details.' },
  { permission_name: 'post_announcement', label: 'Post New Announcement', group: 'Announcements', description: 'Create and publish a new announcement.' },
    
    // User Management
  { permission_name: 'view_user_management', label: 'View User Management Page', group: 'User Management', description: 'Open the user management interface.' },
  { permission_name: 'create_role', label: 'Create Role', group: 'User Management', description: 'Create a new role with selected permissions.' },
  { permission_name: 'update_role', label: 'Update Role', group: 'User Management', description: 'Edit role name or settings.' },
  { permission_name: 'delete_role', label: 'Delete Role', group: 'User Management', description: 'Remove a role from the system.' },
  { permission_name: 'add_user', label: 'Add New User', group: 'User Management', description: 'Create a user account and assign role.' },
  { permission_name: 'update_user', label: 'Update User Details', group: 'User Management', description: 'Edit a user\'s information.' },
  { permission_name: 'delete_user', label: 'Delete User', group: 'User Management', description: 'Deactivate or remove a user account.' },
  { permission_name: 'add_user_role', label: 'Assign Role to User', group: 'User Management', description: 'Assign an existing role to a user.' },
  { permission_name: 'add_user_permission', label: 'Assign Permission to User', group: 'User Management', description: 'Grant specific permissions directly to a user.' },
  { permission_name: 'edit_user_permission', label: 'Edit User Permissions', group: 'User Management', description: 'Modify direct permissions granted to a user.' },
    
    // Profile
  { permission_name: 'view_profile', label: 'View User Profile', group: 'Profile', description: 'View and inspect your own user profile.' },
  { permission_name: 'update_profile', label: 'Update Profile Information', group: 'Profile', description: 'Update your profile information like name and contact.' },
  { permission_name: 'update_password', label: 'Change Account Password', group: 'Profile', description: 'Change your account password.' },
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
