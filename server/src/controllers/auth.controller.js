
const { createClient } = require('@supabase/supabase-js');
const { sendOTPEmail } = require('../services/emailService');
const dotenv = require('dotenv');

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // 1 hour default

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

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate a secure random refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Helper to set httpOnly cookie
const setRefreshTokenCookie = (res, token, expiresAt) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/'
  });
};

// Helper to clear refresh token cookie
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refresh_token', { path: '/' });
};

const resetPassword = async (req, res) => {
  try {
    console.log('Reset password request received:', req.body);
    
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      console.error('Missing fields:', { userId: !!userId, newPassword: !!newPassword });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('Received userId (could be employee_number or auth user id):', userId);

    // First, try to find user by employee_number if userId looks like an employee number
    let userProfile = null;
    let authUserId = null;

    // Check if userId looks like an employee number (contains hyphens)
    if (userId.includes('-')) {
      console.log('Looking up user by employee_number:', userId);
      
      // Find user by employee_number and get their auth user_id
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          employee_number,
          users_profile!inner (
            id,
            email,
            user_id
          )
        `)
        .eq('employee_number', userId)
        .is('deleted_at', null)  // Exclude soft-deleted users
        .single();

      if (userError || !userData) {
        console.error('User not found by employee_number:', userError);
        return res.status(404).json({ message: 'User not found' });
      }

      userProfile = userData.users_profile;
      authUserId = userData.users_profile.user_id;
      console.log('Found user by employee_number, auth user_id:', authUserId);
    } else {
      console.log('Looking up user by auth user_id:', userId);
      
      // Assume userId is an auth user UUID, look it up directly
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .select('id, email, user_id')
        .eq('user_id', userId)
        .is('deleted_at', null)  // Exclude soft-deleted users
        .single();

      if (profileError || !profileData) {
        console.error('User profile not found by user_id:', profileError);
        return res.status(404).json({ message: 'User not found in users_profile' });
      }

      userProfile = profileData;
      authUserId = userId;
      console.log('Found user by auth user_id:', authUserId);
    }

    if (!authUserId) {
      console.error('No auth user_id found');
      return res.status(404).json({ message: 'User authentication record not found' });
    }

    console.log('Found user profile with email:', userProfile.email);

    // Use the custom function to reset password
    console.log('Calling reset_user_password function...');
    
    const { data, error } = await supabaseAdmin.rpc('reset_user_password', {
      user_id: authUserId,
      new_password: newPassword
    });

    if (error) {
      console.error('Error calling reset_user_password function:', error);
      return res.status(500).json({ 
        message: 'Error updating password',
        error: error.message
      });
    }

    console.log('Function result:', data);

    if (data && data.success) {
      console.log('Password updated successfully!');
      res.status(200).json({ message: 'Password updated successfully' });
    } else {
      console.error('Function returned error:', data);
      return res.status(500).json({ 
        message: data?.message || 'Failed to update password'
      });
    }
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to reset password',
      error: error.message
    });
  }
};

const sendOTP = async (req, res) => {
  try {
    console.log('Send OTP request received:', req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists in users_profile table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users_profile')
      .select('user_id, email')
      .eq('email', email)
      .single();

    if (userError || !userProfile) {
      // For security, we'll show success even if user doesn't exist
      return res.status(200).json({ 
        message: 'If an account with this email exists, a verification code has been sent.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10); // OTP expires in 10 minutes

    // Update users_profile with OTP
    const { error: otpError } = await supabaseAdmin
      .from('users_profile')
      .update({
        otp_code: otp,
        otp_expiration: expiration.toISOString()
      })
      .eq('email', email);

    if (otpError) {
      console.error('Error updating OTP:', otpError);
      return res.status(500).json({ message: 'Failed to generate OTP' });
    }

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({ message: 'Failed to send verification code' });
    }

    console.log(`OTP sent successfully to ${email}`);
    
    res.status(200).json({ 
      message: 'Verification code sent to your email successfully!' 
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      message: 'Failed to send verification code',
      error: error.message
    });
  }
};


const login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { employeeNumber, password } = req.body;
    if (!employeeNumber || !password) {
      return res.status(400).json({ message: 'Employee number and password are required' });
    }
    // Step 1: Find user by employee_number and get email from users_profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        employee_number,
        users_profile!inner (
          id,
          email,
          role_id,
          resident_id,
          user_id,
          is_active,
          deleted_at,
          residents (
            first_name,
            last_name
          )
        )
      `)
      .eq('employee_number', employeeNumber)
      .is('deleted_at', null)
      .single();
    if (userError || !userData) {
      console.error('User not found:', userError);
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }
    if (userData.users_profile.deleted_at) {
      console.log('Login attempt for soft-deleted user:', employeeNumber);
      return res.status(403).json({ message: 'Account has been deactivated. Please contact administrator.' });
    }
    if (!userData.users_profile.is_active) {
      console.log('Login attempt for inactive user:', employeeNumber);
      return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
    }
    // Step 2: Check if auth user is soft-deleted before attempting login
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userData.users_profile.user_id);
    if (authUserError || !authUser.user) {
      console.error('Auth user not found:', authUserError);
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }
    if (authUser.user.banned_until || authUser.user.deleted_at) {
      console.log('Login attempt for banned/deleted auth user:', employeeNumber);
      return res.status(403).json({ message: 'Account has been deactivated. Please contact administrator.' });
    }
    // Step 3: Use the email from users_profile to authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.users_profile.email,
      password,
    });
    if (authError) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }
    // Step 4: Issue refresh token
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    // Store refresh token in DB
    const { error: refreshError } = await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        user_id: userData.id,
        token: refreshToken,
        expires_at: expiresAt.toISOString(),
      });
    if (refreshError) {
      console.error('Error storing refresh token:', refreshError);
      return res.status(500).json({ message: 'Failed to issue refresh token' });
    }
    setRefreshTokenCookie(res, refreshToken, expiresAt);
    
    // Step 5: Fetch barangay assignment for role 7 users (Barangay Officials)
    let barangayAssignment = null;
    if (userData.users_profile.role_id === 7) {
      try {
        const { data: barangayData, error: barangayError } = await supabaseAdmin
          .from('barangay_officials')
          .select(`
            barangay_id,
            barangays (
              id,
              name
            )
          `)
          .eq('user_profile_id', userData.users_profile.id)
          .single();

        if (!barangayError && barangayData) {
          barangayAssignment = {
            assigned_barangay: barangayData.barangays?.name || null,
            assigned_barangay_id: barangayData.barangays?.id || null
          };
        }
      } catch (barangayError) {
        console.error('Error fetching barangay assignment during login:', barangayError);
        // Don't fail login if barangay fetch fails
      }
    }

    // Step 6: Return user data and Supabase access token
    const responseData = {
      user: {
        user_id: userData.id,
        auth_id: authData.user?.id,
        email: userData.users_profile.email,
        employee_number: userData.employee_number,
        role_id: userData.users_profile.role_id,
        resident_id: userData.users_profile.resident_id,
        first_name: userData.users_profile.residents?.first_name,
        last_name: userData.users_profile.residents?.last_name,
        ...(barangayAssignment || {})
      },
      token: authData.session?.access_token || '' // Always use Supabase access token
    };
    console.log('Login successful for employee:', employeeNumber);
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
// Refresh endpoint with Supabase access token issuing logic
const refresh = async (req, res) => {
  try {
    console.log('--- REFRESH ENDPOINT DEBUG ---');
    console.log('Cookies:', req.cookies);
    console.log('Body:', req.body);
    const refreshToken = req.cookies?.refresh_token || req.body.refresh_token;
    console.log('Refresh token received:', refreshToken);
    if (!refreshToken) {
      console.log('No refresh token provided');
      return res.status(401).json({ message: 'No refresh token provided' });
    }
    // Find token in DB
    const { data: tokenRow, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('id, user_id, expires_at, revoked')
      .eq('token', refreshToken)
      .single();
    console.log('Token row from DB:', tokenRow, 'Error:', error);
    if (error || !tokenRow) {
      console.log('Invalid refresh token');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (tokenRow.revoked || new Date(tokenRow.expires_at) < new Date()) {
      console.log('Refresh token expired or revoked');
      return res.status(401).json({ message: 'Refresh token expired or revoked' });
    }
    // Get user profile and auth id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, users_profile!inner(id, email, user_id, role_id)')
      .eq('id', tokenRow.user_id)
      .single();
    console.log('User data from DB:', userData, 'Error:', userError);
    if (userError || !userData) {
      console.log('User not found');
      return res.status(401).json({ message: 'User not found' });
    }
    // Get a new Supabase access token for the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.users_profile.email
    });
    if (authError || !authData) {
      console.log('Failed to generate new Supabase access token');
      return res.status(500).json({ message: 'Failed to generate new access token', error: authError?.message });
    }
    // Note: Supabase admin API does not provide a direct way to issue a new access token for a user.
    // You may need to use a custom refresh flow or re-authenticate the user.
    // For now, return an error to indicate this limitation.
    return res.status(501).json({ message: 'Refresh with Supabase access token is not fully implemented. See backend code for details.' });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Logout endpoint
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refresh_token;
    if (refreshToken) {
      // Revoke the token in DB
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('token', refreshToken);
    }
    clearRefreshTokenCookie(res);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  resetPassword,
  sendOTP,
  login,
  refresh,
  logout
};
