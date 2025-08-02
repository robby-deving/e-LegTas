const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
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

// Generate employee number
const generateEmployeeNumber = () => {
  const currentYear = new Date().getFullYear();
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  const sequence = Math.floor(10000 + Math.random() * 90000); // 5-digit sequence
  return `${currentYear}-${randomNumber}-${sequence}`;
};

const createUser = async (req, res) => {
  try {
    console.log('Create user request received:', req.body);
    
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      sex,
      birthdate,
      barangayOfOrigin,
      employeeNumber: providedEmployeeNumber,
      email,
      password,
      roleId,
      assignedEvacuationCenter
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !sex || !birthdate || !email || !password || !roleId) {
      return res.status(400).json({ 
        message: 'Missing required fields: firstName, lastName, sex, birthdate, email, password, roleId' 
      });
    }

    // Validate birthdate format (YYYY-MM-DD)
    const birthdateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthdateRegex.test(birthdate)) {
      return res.status(400).json({ 
        message: 'Invalid birthdate format. Use YYYY-MM-DD format (e.g., 1990-01-15)' 
      });
    }

    // Validate suffix enum values (if provided)
    const validSuffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
    if (suffix && !validSuffixes.includes(suffix)) {
      return res.status(400).json({ 
        message: `Invalid suffix. Allowed values: ${validSuffixes.join(', ')}` 
      });
    }

    // Validate sex enum values
    const validSexValues = ['Male', 'Female'];
    if (!validSexValues.includes(sex)) {
      return res.status(400).json({ 
        message: `Invalid sex value. Allowed values: ${validSexValues.join(', ')}` 
      });
    }

    // Check if email already exists in users_profile
    const { data: existingUser } = await supabaseAdmin
      .from('users_profile')
      .select('email')
      .eq('email', email)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Generate unique employee number or use provided one
    let employeeNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    if (providedEmployeeNumber) {
      // Check if provided employee number is unique
      const { data: existingEmployee } = await supabaseAdmin
        .from('users')
        .select('employee_number')
        .eq('employee_number', providedEmployeeNumber)
        .is('deleted_at', null)  // Exclude soft-deleted users
        .single();

      if (existingEmployee) {
        return res.status(409).json({ message: 'Employee number already exists' });
      }
      
      employeeNumber = providedEmployeeNumber;
      isUnique = true;
    } else {
      // Generate unique employee number if not provided
      while (!isUnique && attempts < maxAttempts) {
        employeeNumber = generateEmployeeNumber();
        
        const { data: existingEmployee } = await supabaseAdmin
          .from('users')
          .select('employee_number')
          .eq('employee_number', employeeNumber)
          .is('deleted_at', null)  // Exclude soft-deleted users
          .single();

        if (!existingEmployee) {
          isUnique = true;
        }
        attempts++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Failed to generate unique employee number' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create resident first
    const { data: resident, error: residentError } = await supabaseAdmin
      .from('residents')
      .insert({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: suffix || null,
        sex: sex,
        birthdate: birthdate,
        barangay_of_origin: barangayOfOrigin ? parseInt(barangayOfOrigin) : null
      })
      .select()
      .single();

    if (residentError) {
      console.error('Error creating resident:', residentError);
      return res.status(500).json({ 
        message: 'Failed to create resident profile',
        error: residentError.message
      });
    }

    // Create users_profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .insert({
        resident_id: resident.id,
        email: email,
        password_hash: passwordHash,
        role_id: parseInt(roleId),
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      
      // Cleanup: delete the resident record
      await supabaseAdmin
        .from('residents')
        .delete()
        .eq('id', resident.id);

      return res.status(500).json({ 
        message: 'Failed to create user profile',
        error: profileError.message
      });
    }

    // Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        user_profile_id: userProfile.id,
        employee_number: employeeNumber
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      
      // Cleanup: delete the user profile and resident records
      await supabaseAdmin
        .from('users_profile')
        .delete()
        .eq('id', userProfile.id);
      
      await supabaseAdmin
        .from('residents')
        .delete()
        .eq('id', resident.id);

      return res.status(500).json({ 
        message: 'Failed to create user',
        error: userError.message
      });
    }

    // Create Supabase auth user for login capability
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        employee_number: employeeNumber,
        first_name: firstName,
        last_name: lastName,
        role_id: roleId
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Cleanup: delete all created records
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id);
      
      await supabaseAdmin
        .from('users_profile')
        .delete()
        .eq('id', userProfile.id);
      
      await supabaseAdmin
        .from('residents')
        .delete()
        .eq('id', resident.id);

      return res.status(500).json({ 
        message: 'Failed to create authentication user. User creation rolled back.',
        error: authError.message
      });
    }

    // Update users_profile with auth user ID
    const { error: updateError } = await supabaseAdmin
      .from('users_profile')
      .update({ user_id: authUser.user.id })
      .eq('id', userProfile.id);

    if (updateError) {
      console.error('Error linking auth user to profile:', updateError);
      // Note: This is not critical, the user can still login with their email
    }

    // Handle evacuation center assignment if provided
    let evacuationCenterAssignment = null;
    if (assignedEvacuationCenter && assignedEvacuationCenter.trim()) {
      try {
        // Find evacuation center by name
        let { data: evacuationCenter, error: centerError } = await supabaseAdmin
          .from('evacuation_centers')
          .select('id, name, assigned_user_id')
          .eq('name', assignedEvacuationCenter.trim())
          .single();

        if (centerError && centerError.code === 'PGRST116') {
          // Evacuation center doesn't exist, create it
          const { data: newCenter, error: createCenterError } = await supabaseAdmin
            .from('evacuation_centers')
            .insert({
              name: assignedEvacuationCenter.trim(),
              address: 'To be determined',
              barangay_id: 1, // Default barangay, should be updated later
              latitude: 0.0,
              longitude: 0.0,
              ec_status: 'Active',
              category: 'Public',
              total_capacity: 100, // Default capacity
              assigned_user_id: user.id,
              created_by: user.id
            })
            .select()
            .single();

          if (createCenterError) {
            console.error('Error creating evacuation center:', createCenterError);
          } else {
            evacuationCenter = newCenter;
            evacuationCenterAssignment = {
              center_name: evacuationCenter.name,
              center_id: evacuationCenter.id,
              status: 'assigned_new'
            };
          }
        } else if (evacuationCenter) {
          // Evacuation center exists, update its assigned_user_id
          const { error: updateError } = await supabaseAdmin
            .from('evacuation_centers')
            .update({ assigned_user_id: user.id })
            .eq('id', evacuationCenter.id);

          if (updateError) {
            console.error('Error updating evacuation center assignment:', updateError);
          } else {
            evacuationCenterAssignment = {
              center_name: evacuationCenter.name,
              center_id: evacuationCenter.id,
              status: 'assigned_existing'
            };
          }
        }
      } catch (evacuationError) {
        console.error('Error handling evacuation center assignment:', evacuationError);
        // Don't fail the entire user creation if evacuation assignment fails
      }
    }

    // Return success response
    const responseData = {
      message: 'User created successfully with login capability',
      user: {
        id: user.id,
        employee_number: employeeNumber,
        email: email,
        auth_user_id: authUser.user.id,
        resident: {
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          suffix: suffix,
          sex: sex,
          birthdate: birthdate
        },
        role_id: roleId,
        is_active: true,
        evacuation_assignment: evacuationCenterAssignment
      }
    };

    console.log('User created successfully:', responseData);
    res.status(201).json(responseData);

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        created_at,
        user_profile_id,
        users_profile!user_profile_id (
          id,
          email,
          role_id,
          is_active,
          roles!role_id (
            id,
            role_name
          ),
          residents!resident_id (
            first_name,
            middle_name,
            last_name,
            suffix,
            sex,
            barangay_of_origin,
            barangays!barangay_of_origin (
              id,
              name
            )
          )
        )
      `)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`users_profile.residents.first_name.ilike.%${search}%,users_profile.residents.last_name.ilike.%${search}%,users_profile.email.ilike.%${search}%,employee_number.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);  // Exclude soft-deleted users from count

    if (countError) {
      console.error('Error counting users:', countError);
      return res.status(500).json({ message: 'Failed to count users' });
    }

    res.status(200).json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        created_at,
        user_profile_id,
        users_profile!user_profile_id (
          id,
          email,
          role_id,
          is_active,
          roles!role_id (
            id,
            role_name
          ),
          residents!resident_id (
            first_name,
            middle_name,
            last_name,
            suffix,
            sex,
            birthdate,
            barangay_of_origin,
            barangays!barangay_of_origin (
              id,
              name
            )
          )
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const updateUser = async (req, res) => {
  try {
    console.log('Update user request received:', req.body);
    
    const { id } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      sex,
      birthdate,
      barangayOfOrigin,
      employeeNumber,
      email,
      password,
      roleId,
      assignedEvacuationCenter
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !sex || !birthdate || !email || !roleId) {
      return res.status(400).json({ 
        message: 'Missing required fields: firstName, lastName, sex, birthdate, email, roleId' 
      });
    }

    // Validate birthdate format (YYYY-MM-DD)
    const birthdateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthdateRegex.test(birthdate)) {
      return res.status(400).json({ 
        message: 'Invalid birthdate format. Use YYYY-MM-DD format (e.g., 1990-01-15)' 
      });
    }

    // Validate suffix enum values (if provided)
    const validSuffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
    if (suffix && !validSuffixes.includes(suffix)) {
      return res.status(400).json({ 
        message: `Invalid suffix. Allowed values: ${validSuffixes.join(', ')}` 
      });
    }

    // Validate sex enum values
    const validSexValues = ['Male', 'Female'];
    if (!validSexValues.includes(sex)) {
      return res.status(400).json({ 
        message: `Invalid sex value. Allowed values: ${validSexValues.join(', ')}` 
      });
    }

    // First, get the existing user to get related IDs
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        user_profile_id,
        users_profile!user_profile_id (
          id,
          email,
          role_id,
          resident_id,
          user_id
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if new email already exists
    if (email !== existingUser.users_profile.email) {
      const { data: emailCheck } = await supabaseAdmin
        .from('users_profile')
        .select('email')
        .eq('email', email)
        .neq('id', existingUser.users_profile.id)
        .is('deleted_at', null)  // Exclude soft-deleted users
        .single();

      if (emailCheck) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    // Check if employee number is being changed and if new employee number already exists
    if (employeeNumber && employeeNumber !== existingUser.employee_number) {
      const { data: employeeCheck } = await supabaseAdmin
        .from('users')
        .select('employee_number')
        .eq('employee_number', employeeNumber)
        .neq('id', id)
        .is('deleted_at', null)  // Exclude soft-deleted users
        .single();

      if (employeeCheck) {
        return res.status(409).json({ message: 'Employee number already exists' });
      }
    }

    // Update resident record
    const { error: residentError } = await supabaseAdmin
      .from('residents')
      .update({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: suffix || null,
        sex: sex,
        birthdate: birthdate,
        barangay_of_origin: barangayOfOrigin ? parseInt(barangayOfOrigin) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.users_profile.resident_id);

    if (residentError) {
      console.error('Error updating resident:', residentError);
      return res.status(500).json({ 
        message: 'Failed to update resident profile',
        error: residentError.message
      });
    }

    // Prepare users_profile update data
    const profileUpdateData = {
      email: email,
      role_id: parseInt(roleId),
      updated_at: new Date().toISOString()
    };

    // Add password hash if password is provided
    if (password && password.trim()) {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      profileUpdateData.password_hash = passwordHash;
    }

    // Update users_profile
    const { error: profileError } = await supabaseAdmin
      .from('users_profile')
      .update(profileUpdateData)
      .eq('id', existingUser.users_profile.id);

    if (profileError) {
      console.error('Error updating user profile:', profileError);
      return res.status(500).json({ 
        message: 'Failed to update user profile',
        error: profileError.message
      });
    }

    // Update user record (employee number)
    if (employeeNumber) {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({
          employee_number: employeeNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (userError) {
        console.error('Error updating user:', userError);
        return res.status(500).json({ 
          message: 'Failed to update user record',
          error: userError.message
        });
      }
    }

    // Update Supabase auth user if email or password changed
    if (existingUser.users_profile.user_id) {
      const authUpdateData = {};
      
      if (email !== existingUser.users_profile.email) {
        authUpdateData.email = email;
      }
      
      if (password && password.trim()) {
        authUpdateData.password = password;
      }

      if (Object.keys(authUpdateData).length > 0) {
        console.log('Updating Supabase auth user with:', { 
          user_id: existingUser.users_profile.user_id, 
          updates: Object.keys(authUpdateData) 
        });
        
        const { data: authUpdateResult, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.users_profile.user_id,
          authUpdateData
        );

        if (authError) {
          console.error('Error updating auth user:', authError);
          return res.status(500).json({ 
            message: 'Failed to update authentication credentials',
            error: authError.message
          });
        } else {
          console.log('Auth user updated successfully:', authUpdateResult);
        }
      }
    } else {
      console.warn('No auth user_id found for user profile:', existingUser.users_profile.id);
    }

    // Handle evacuation center assignment if provided
    let evacuationCenterAssignment = null;
    console.log('Processing evacuation center assignment. assignedEvacuationCenter:', assignedEvacuationCenter);
    
    if (assignedEvacuationCenter && assignedEvacuationCenter.trim()) {
      try {
        console.log('Assigning user', id, 'to evacuation center:', assignedEvacuationCenter);
        
        // Database trigger will automatically clear existing assignments when we assign a new one
        const { error: assignmentError } = await supabaseAdmin
          .from('evacuation_centers')
          .update({ assigned_user_id: id })
          .eq('name', assignedEvacuationCenter);

        if (assignmentError) {
          console.error('Error updating evacuation center assignment:', assignmentError);
        } else {
          console.log('Successfully assigned user', id, 'to center:', assignedEvacuationCenter);
          evacuationCenterAssignment = assignedEvacuationCenter;
        }
      } catch (evacuationError) {
        console.error('Error handling evacuation center assignment:', evacuationError);
      }
    } else {
      // Remove user from any existing evacuation center assignments if no center is selected
      console.log('No evacuation center selected, clearing all assignments for user:', id);
      try {
        const { error: clearError } = await supabaseAdmin
          .from('evacuation_centers')
          .update({ assigned_user_id: null })
          .eq('assigned_user_id', id);
          
        if (clearError) {
          console.error('Error removing evacuation center assignment:', clearError);
        } else {
          console.log('Successfully removed all evacuation center assignments for user:', id);
        }
      } catch (evacuationError) {
        console.error('Error removing evacuation center assignment:', evacuationError);
      }
    }

    // Return success response
    const responseData = {
      message: 'User updated successfully',
      user: {
        id: parseInt(id),
        employee_number: employeeNumber || existingUser.employee_number,
        email: email,
        role_id: parseInt(roleId),
        evacuation_assignment: evacuationCenterAssignment
      }
    };

    console.log('User updated successfully:', responseData);
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const { data: roles, error } = await supabaseAdmin
      .from('roles')
      .select('id, role_name, is_active')
      .eq('is_active', true)
      .order('role_name');

    if (error) {
      console.error('Error fetching roles:', error);
      return res.status(500).json({ message: 'Failed to fetch roles' });
    }

    // Transform the data to match the expected format
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.role_name
    }));

    res.status(200).json({ roles: formattedRoles });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getEvacuationCenters = async (req, res) => {
  try {
    const { data: centers, error } = await supabaseAdmin
      .from('evacuation_centers')
      .select(`
        id, 
        name, 
        address,
        barangay_id,
        latitude,
        longitude,
        ec_status,
        category,
        total_capacity,
        assigned_user_id,
        barangays!barangay_id (
          id,
          name
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching evacuation centers:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch evacuation centers',
        error: error.message 
      });
    }

    // Transform the data to include barangay information
    const formattedCenters = centers?.map(center => ({
      id: center.id,
      name: center.name,
      address: center.address,
      barangay: center.barangays?.name || 'Unknown',
      status: center.ec_status,
      category: center.category,
      capacity: center.total_capacity,
      assigned_user_id: center.assigned_user_id, // Fixed: use the correct field
      coordinates: {
        latitude: center.latitude,
        longitude: center.longitude
      }
    })) || [];

    res.status(200).json({ centers: formattedCenters });

  } catch (error) {
    console.error('Get evacuation centers error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getBarangays = async (req, res) => {
  try {
    const { data: barangays, error } = await supabaseAdmin
      .from('barangays')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching barangays:', error);
      return res.status(500).json({ message: 'Failed to fetch barangays' });
    }

    res.status(200).json({ barangays });

  } catch (error) {
    console.error('Get barangays error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getDisasters = async (req, res) => {
  try {
    const { data: disasters, error } = await supabaseAdmin
      .from('disasters')
      .select(`
        id,
        disaster_name,
        disaster_type_id,
        disaster_start_date,
        disaster_end_date,
        disaster_types!disaster_type_id (
          id,
          name
        )
      `)
      .order('disaster_start_date', { ascending: false });

    if (error) {
      console.error('Error fetching disasters:', error);
      return res.status(500).json({ message: 'Failed to fetch disasters' });
    }

    res.status(200).json({ disasters });

  } catch (error) {
    console.error('Get disasters error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getEnumValues = async (req, res) => {
  try {
    const enumValues = {
      suffix: ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'],
      sex: ['Male', 'Female']
    };

    res.status(200).json({ enumValues });

  } catch (error) {
    console.error('Get enum values error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Function to detect and report synchronization issues
const checkUserSynchronization = async (req, res) => {
  try {
    // Get all users from custom tables
    const { data: customUsers, error: customError } = await supabaseAdmin
      .from('users_profile')
      .select('email, id');

    if (customError) {
      return res.status(500).json({ message: 'Failed to fetch custom users' });
    }

    // Get all users from auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return res.status(500).json({ message: 'Failed to fetch auth users' });
    }

    const authUsers = authData.users || [];
    
    // Find mismatches
    const customEmails = customUsers.map(u => u.email);
    const authEmails = authUsers.map(u => u.email);
    
    const onlyInCustom = customEmails.filter(email => !authEmails.includes(email));
    const onlyInAuth = authEmails.filter(email => !customEmails.includes(email));
    
    res.status(200).json({
      totalCustomUsers: customUsers.length,
      totalAuthUsers: authUsers.length,
      synchronized: onlyInCustom.length === 0 && onlyInAuth.length === 0,
      issues: {
        usersWithoutAuth: onlyInCustom.length,
        authWithoutProfile: onlyInAuth.length,
        detailsCustomOnly: onlyInCustom,
        detailsAuthOnly: onlyInAuth
      }
    });

  } catch (error) {
    console.error('Check synchronization error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Simplified user creation using auth.users trigger
const createUserWithTrigger = async (req, res) => {
  try {
    console.log('Create user with trigger request received:', req.body);
    
    const { 
      email, 
      password,
      firstName,
      middleName,
      lastName,
      suffix,
      sex,
      birthdate,
      barangayOfOrigin,
      roleId 
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !sex || !birthdate || !roleId) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, password, firstName, lastName, sex, birthdate, roleId' 
      });
    }

    // Validate enums
    const validSuffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
    if (suffix && !validSuffixes.includes(suffix)) {
      return res.status(400).json({ 
        message: `Invalid suffix. Must be one of: ${validSuffixes.join(', ')}` 
      });
    }

    const validSexValues = ['Male', 'Female'];
    if (!validSexValues.includes(sex)) {
      return res.status(400).json({ 
        message: `Invalid sex. Must be one of: ${validSexValues.join(', ')}` 
      });
    }

    // Check if email already exists in auth.users
    const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
    if (existingAuthUser && existingAuthUser.users.find(u => u.email === email)) {
      return res.status(409).json({ message: 'Email already exists in authentication system' });
    }

    // Check if email already exists in users_profile
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('users_profile')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return res.status(409).json({ message: 'Email already exists in user profiles' });
    }

    // First create the resident record (this is needed for the profile)
    const { data: residentData, error: residentError } = await supabaseAdmin
      .from('residents')
      .insert({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: suffix || null,
        sex: sex,
        birthdate: birthdate,
        barangay_of_origin: barangayOfOrigin || null
      })
      .select()
      .single();

    if (residentError) {
      console.error('Error creating resident:', residentError);
      return res.status(500).json({ 
        message: 'Failed to create resident profile',
        error: residentError.message
      });
    }

    // Generate employee number
    let employeeNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      employeeNumber = generateEmployeeNumber();
      
      const { data: existingEmployee } = await supabaseAdmin
        .from('users')
        .select('employee_number')
        .eq('employee_number', employeeNumber)
        .single();

      if (!existingEmployee) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      // Cleanup resident record
      await supabaseAdmin
        .from('residents')
        .delete()
        .eq('id', residentData.id);
        
      return res.status(500).json({ message: 'Failed to generate unique employee number' });
    }

    try {
      // Create Supabase auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role_id: roleId,
          employee_number: employeeNumber
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        
        // Cleanup resident record
        await supabaseAdmin
          .from('residents')
          .delete()
          .eq('id', residentData.id);
          
        return res.status(500).json({ 
          message: 'Failed to create authentication user',
          error: authError.message
        });
      }

      // Create users_profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .insert({
          user_id: authUser.user.id,
          resident_id: residentData.id,
          email: email,
          password_hash: '', // Empty since auth handles this
          role_id: parseInt(roleId),
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        
        // Cleanup auth user and resident
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        await supabaseAdmin
          .from('residents')
          .delete()
          .eq('id', residentData.id);
          
        return res.status(500).json({ 
          message: 'Failed to create user profile',
          error: profileError.message
        });
      }

      // Create user record
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          user_profile_id: userProfile.id,
          employee_number: employeeNumber
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        
        // Cleanup
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        await supabaseAdmin
          .from('users_profile')
          .delete()
          .eq('id', userProfile.id);
        await supabaseAdmin
          .from('residents')
          .delete()
          .eq('id', residentData.id);
          
        return res.status(500).json({ 
          message: 'Failed to create user',
          error: userError.message
        });
      }

      res.status(201).json({
        message: 'User created successfully with complete profile',
        user: {
          id: user.id,
          employee_number: employeeNumber,
          email: email,
          auth_user_id: authUser.user.id,
          resident: {
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix: suffix,
            sex: sex,
            birthdate: birthdate
          },
          role_id: roleId,
          is_active: true
        }
      });

    } catch (error) {
      console.error('Unexpected error in user creation:', error);
      
      // Cleanup resident record
      await supabaseAdmin
        .from('residents')
        .delete()
        .eq('id', residentData.id);
        
      return res.status(500).json({ 
        message: 'Unexpected error during user creation',
        error: error.message
      });
    }

  } catch (error) {
    console.error('Create user with trigger error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Complete profile for existing auth users (useful for trigger testing)
const completeUserProfile = async (req, res) => {
  try {
    console.log('Complete user profile request received:', req.body);
    
    const {
      email,
      firstName,
      middleName,
      lastName,
      suffix,
      sex,
      birthdate,
      barangayOfOrigin,
      roleId
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !sex || !birthdate || !roleId) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, firstName, lastName, sex, birthdate, roleId' 
      });
    }

    // Check if user exists in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      return res.status(500).json({ message: 'Failed to check auth users' });
    }

    const authUser = authData.users.find(u => u.email === email);
    if (!authUser) {
      return res.status(404).json({ message: 'User not found in authentication system' });
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('users_profile')
      .select('email')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return res.status(409).json({ message: 'User profile already exists' });
    }

    // Generate employee number
    let employeeNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      employeeNumber = generateEmployeeNumber();
      
      const { data: existingEmployee } = await supabaseAdmin
        .from('users')
        .select('employee_number')
        .eq('employee_number', employeeNumber)
        .single();

      if (!existingEmployee) {
        isUnique = true;
      }
      attempts++;
    }

    // Create resident record
    const { data: resident, error: residentError } = await supabaseAdmin
      .from('residents')
      .insert({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: suffix || null,
        sex: sex,
        birthdate: birthdate,
        barangay_of_origin: barangayOfOrigin ? parseInt(barangayOfOrigin) : null
      })
      .select()
      .single();

    if (residentError) {
      return res.status(500).json({ 
        message: 'Failed to create resident profile',
        error: residentError.message
      });
    }

    // Create users_profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .insert({
        resident_id: resident.id,
        email: email,
        password_hash: '', // Empty since auth handles this
        role_id: parseInt(roleId),
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup
      await supabaseAdmin.from('residents').delete().eq('id', resident.id);
      return res.status(500).json({ 
        message: 'Failed to create user profile',
        error: profileError.message
      });
    }

    // Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        user_profile_id: userProfile.id,
        employee_number: employeeNumber
      })
      .select()
      .single();

    if (userError) {
      // Cleanup
      await supabaseAdmin.from('users_profile').delete().eq('id', userProfile.id);
      await supabaseAdmin.from('residents').delete().eq('id', resident.id);
      return res.status(500).json({ 
        message: 'Failed to create user',
        error: userError.message
      });
    }

    res.status(201).json({
      message: 'User profile completed successfully',
      user: {
        id: user.id,
        employee_number: employeeNumber,
        email: email,
        auth_user_id: authUser.id
      }
    });

  } catch (error) {
    console.error('Complete user profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get users by role_id
const getUsersByRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Validate roleId
    if (!roleId || isNaN(parseInt(roleId))) {
      return res.status(400).json({ 
        message: 'Invalid role ID provided',
        error: 'Role ID must be a valid number'
      });
    }

    const roleIdInt = parseInt(roleId);

    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        created_at,
        user_profile_id,
        users_profile!user_profile_id (
          id,
          email,
          role_id,
          is_active,
          roles!role_id (
            id,
            role_name
          ),
          residents!resident_id (
            first_name,
            middle_name,
            last_name,
            suffix,
            sex,
            birthdate,
            barangay_of_origin,
            barangays!barangay_of_origin (
              id,
              name
            )
          )
        )
      `)
      .eq('users_profile.role_id', roleIdInt)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`users_profile.residents.first_name.ilike.%${search}%,users_profile.residents.last_name.ilike.%${search}%,users_profile.email.ilike.%${search}%,employee_number.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error(`Error fetching users with role_id ${roleIdInt}:`, error);
      return res.status(500).json({ 
        message: `Failed to fetch users with role_id ${roleIdInt}`,
        error: error.message 
      });
    }

    // Get total count for users with specified role_id
    const { data: allUsers, error: countError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        users_profile!user_profile_id (
          role_id
        )
      `)
      .eq('users_profile.role_id', roleIdInt)
      .is('deleted_at', null);  // Exclude soft-deleted users

    if (countError) {
      console.error(`Error counting users with role_id ${roleIdInt}:`, countError);
      return res.status(500).json({ 
        message: `Failed to count users with role_id ${roleIdInt}`,
        error: countError.message 
      });
    }

    const totalCount = allUsers ? allUsers.length : 0;

    res.status(200).json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get users with role_id 4 and 5 (for role-based restrictions)
const getUsersWithRoleFourAndFive = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Role IDs 4 and 5
    const targetRoleIds = [4, 5];

    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        created_at,
        user_profile_id,
        users_profile!user_profile_id (
          id,
          email,
          role_id,
          is_active,
          roles!role_id (
            id,
            role_name
          ),
          residents!resident_id (
            first_name,
            middle_name,
            last_name,
            suffix,
            sex,
            birthdate,
            barangay_of_origin,
            barangays!barangay_of_origin (
              id,
              name
            )
          )
        )
      `)
      .in('users_profile.role_id', targetRoleIds)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`users_profile.residents.first_name.ilike.%${search}%,users_profile.residents.last_name.ilike.%${search}%,users_profile.email.ilike.%${search}%,employee_number.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users with role_id 4 and 5:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch users with role_id 4 and 5',
        error: error.message 
      });
    }

    // Get evacuation center assignments for these users
    let usersWithEvacuationCenters = users;
    if (users && users.length > 0) {
      const userIds = users.map(user => user.id);
      
      const { data: evacuationAssignments, error: evacuationError } = await supabaseAdmin
        .from('evacuation_centers')
        .select('id, name, assigned_user_id')
        .in('assigned_user_id', userIds);

      if (evacuationError) {
        console.error('Error fetching evacuation assignments:', evacuationError);
        // Continue without evacuation center data
      } else {
        // Merge evacuation center data with users
        usersWithEvacuationCenters = users.map(user => {
          const assignment = evacuationAssignments?.find(assignment => assignment.assigned_user_id === user.id);
          return {
            ...user,
            assigned_evacuation_center: assignment?.name || null
          };
        });
      }
    }

    // Get total count for users with role_id 4 and 5
    const { data: allUsers, error: countError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        users_profile!user_profile_id (
          role_id
        )
      `)
      .in('users_profile.role_id', targetRoleIds)
      .is('deleted_at', null);  // Exclude soft-deleted users

    if (countError) {
      console.error('Error counting users with role_id 4 and 5:', countError);
      return res.status(500).json({ 
        message: 'Failed to count users with role_id 4 and 5',
        error: countError.message 
      });
    }

    const totalCount = allUsers ? allUsers.length : 0;

    res.status(200).json({
      users: usersWithEvacuationCenters,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get users with role 4 and 5 error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Soft delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // First, get the user details to check if they exist and get the auth user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        user_profile_id,
        users_profile!user_profile_id (
          id,
          email,
          user_id,
          is_active
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (userError || !user) {
      console.error('Error fetching user for deletion:', userError);
      return res.status(404).json({ message: 'User not found' });
    }

    const authUserId = user.users_profile?.user_id;
    const userProfileId = user.user_profile_id;

    // Perform soft delete operations in a transaction-like manner
    const now = new Date().toISOString();

    // 1. Soft delete the user record
    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .update({ 
        deleted_at: now,
        updated_at: now
      })
      .eq('id', id);

    if (userDeleteError) {
      console.error('Error soft deleting user:', userDeleteError);
      return res.status(500).json({ message: 'Failed to delete user' });
    }

    // 2. Soft delete the user profile record
    if (userProfileId) {
      const { error: profileDeleteError } = await supabaseAdmin
        .from('users_profile')
        .update({ 
          deleted_at: now,
          is_active: false,
          updated_at: now
        })
        .eq('id', userProfileId);

      if (profileDeleteError) {
        console.error('Error soft deleting user profile:', profileDeleteError);
        // We could try to rollback the user deletion here, but for simplicity, we'll log the error
      }
    }

    // 3. Clear evacuation center assignment (if any)
    const { error: evacuationCenterError } = await supabaseAdmin
      .from('evacuation_centers')
      .update({ 
        assigned_user_id: null,
        updated_at: now
      })
      .eq('assigned_user_id', id);

    if (evacuationCenterError) {
      console.error('Error clearing evacuation center assignment:', evacuationCenterError);
      // Continue with the process even if this fails
    }

    // 4. Set deleted_at in auth.users table to prevent login
    if (authUserId) {
      try {
        // First update user metadata
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            account_status: 'deleted',
            deleted_at: now,
            deleted_by: 'system'
          }
        });

        // Use RPC to update auth.users deleted_at column
        // This requires a PostgreSQL function that can bypass RLS
        const { error: authDeleteError } = await supabaseAdmin.rpc('soft_delete_auth_user', {
          user_id: authUserId,
          deleted_timestamp: now
        });

        if (authDeleteError) {
          console.log('Note: Could not update auth.users deleted_at via RPC, but user metadata updated');
          console.log('You may need to create the soft_delete_auth_user function in PostgreSQL');
        } else {
          console.log(`Auth user ${authUserId} deleted_at set to ${now}`);
        }
      } catch (authError) {
        console.error('Error updating auth user:', authError);
        // Continue with the process even if this fails
      }
    }

    console.log(`User ${id} (${user.employee_number}) successfully soft deleted`);

    res.status(200).json({ 
      message: 'User successfully deleted',
      deletedUser: {
        id: user.id,
        employee_number: user.employee_number,
        email: user.users_profile?.email
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if user can login (not soft deleted)
const checkUserCanLogin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists in auth.users and is not soft deleted
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return res.status(500).json({ message: 'Failed to check user status' });
    }

    const authUser = authUsers.users.find(u => u.email === email);
    
    if (!authUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is soft deleted in auth.users
    if (authUser.deleted_at) {
      return res.status(403).json({ 
        message: 'Account has been deactivated. Please contact administrator.',
        canLogin: false,
        deleted_at: authUser.deleted_at
      });
    }

    // Also check our custom tables
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('id, deleted_at, is_active')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    if (userProfile.deleted_at) {
      return res.status(403).json({ 
        message: 'Account has been deactivated. Please contact administrator.',
        canLogin: false,
        deleted_at: userProfile.deleted_at
      });
    }

    if (!userProfile.is_active) {
      return res.status(403).json({ 
        message: 'Account is inactive. Please contact administrator.',
        canLogin: false
      });
    }

    return res.status(200).json({ 
      message: 'User can login',
      canLogin: true,
      authUserId: authUser.id,
      profileId: userProfile.id
    });

  } catch (error) {
    console.error('Check user login error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  getUsersByRole,
  getRoles,
  getEvacuationCenters,
  getBarangays,
  getDisasters,
  getEnumValues,
  checkUserSynchronization,
  createUserWithTrigger,
  completeUserProfile,
  getUsersWithRoleFourAndFive,
  deleteUser,
  checkUserCanLogin
};
