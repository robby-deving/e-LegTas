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
      email,
      password,
      roleId
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
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Generate unique employee number
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
        is_active: true
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
      .select('*', { count: 'exact', head: true });

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
      .select('id, name, location')
      .order('name');

    if (error) {
      console.error('Error fetching evacuation centers:', error);
      // Return default evacuation centers if table doesn't exist
      const defaultCenters = [
        { id: 1, name: 'Legazpi Elementary School', location: 'Legazpi City' },
        { id: 2, name: 'Legazpi High School', location: 'Legazpi City' },
        { id: 3, name: 'Bicol University Gymnasium', location: 'Legazpi City' },
        { id: 4, name: 'Legazpi Sports Complex', location: 'Legazpi City' }
      ];
      return res.status(200).json({ centers: defaultCenters });
    }

    res.status(200).json({ centers });

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
        
        // Cleanup all records
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
          message: 'Failed to create user record',
          error: userError.message
        });
      }

      // Return success response
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

module.exports = {
  createUser,
  getUsers,
  getUserById,
  getRoles,
  getEvacuationCenters,
  getBarangays,
  getEnumValues,
  checkUserSynchronization,
  createUserWithTrigger,
  completeUserProfile
};
