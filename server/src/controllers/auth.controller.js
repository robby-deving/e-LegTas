
const { createClient } = require('@supabase/supabase-js');
const { sendOTPEmail } = require('../services/emailService');
const dotenv = require('dotenv');
const logger = require('../utils/logger');
const {
  validateEmail,
  validateEmployeeNumber,
  validatePassword,
  validateId,
  validateOTP
} = require('../utils/validateInput');

// Removed unused JWT and crypto utilities

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Public client for auth refresh exchanges
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate a secure random refresh token
// Removed legacy custom refresh token generator and setter

// Helper to clear refresh token cookie
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refresh_token', { path: '/' });
};

// Helper to set Supabase refresh token cookie
const setSbRefreshTokenCookie = (res, token, maxAgeDays = 30) => {
  const isProd = process.env.NODE_ENV === 'production';
  const expires = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000);
  res.cookie('sb_refresh_token', token, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'strict' : 'lax',
    expires,
    path: '/'
  });
};

const clearSbRefreshTokenCookie = (res) => {
  res.clearCookie('sb_refresh_token', { path: '/' });
};

const resetPassword = async (req, res) => {
  try {
    logger.info('Reset password request received', { body: req.body });
    
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      logger.warn('Missing fields in reset password request', { userId: !!userId, newPassword: !!newPassword });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate userId (UUID format)
    const userIdValidation = validateId(userId, 'uuid');
    if (!userIdValidation.isValid) {
      logger.warn('Invalid userId format in reset password request', { error: userIdValidation.error });
      return res.status(400).json({ message: userIdValidation.error });
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      logger.warn('Invalid password in reset password request', { error: passwordValidation.error });
      return res.status(400).json({ message: passwordValidation.error });
    }

    logger.debug('Received userId for password reset', { userId });

    // Verify the user exists and is active
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('id, email, user_id')
      .eq('user_id', userId)
      .is('deleted_at', null)  // Exclude soft-deleted users
      .single();

    if (profileError || !userProfile) {
      logger.warn('User profile not found during password reset', { error: profileError });
      return res.status(404).json({ message: 'User not found' });
    }

    // Since we get the auth user_id directly from OTP verification,
    // we can use it directly for the password reset
    const authUserId = userId;

    if (!authUserId) {
      logger.warn('No auth user_id found during password reset');
      return res.status(404).json({ message: 'User authentication record not found' });
    }

    logger.debug('Found user profile for password reset', { email: userProfile.email });

    // Clear any existing OTP data first
    const { error: clearOtpError } = await supabaseAdmin
      .from('users_profile')
      .update({ 
        otp_code: null, 
        otp_expiration: null 
      })
      .eq('user_id', authUserId);

    if (clearOtpError) {
      logger.error('Error clearing OTP data during password reset', { error: clearOtpError });
      // Don't return error - continue with password reset
    }

    // Use the custom function to reset password
    logger.debug('Calling reset_user_password function', { userId: authUserId });
    
    const { data, error } = await supabaseAdmin.rpc('reset_user_password', {
      user_id: authUserId,
      new_password: newPassword
    });

    if (error) {
      logger.error('Error calling reset_user_password function', { error: error.message });
      return res.status(500).json({ 
        message: 'Error updating password',
        error: error.message
      });
    }

    logger.debug('Password reset function result', { success: data?.success });

    if (data && data.success) {
      logger.info('Password updated successfully', { userId: authUserId });
      res.status(200).json({ message: 'Password updated successfully' });
    } else {
      logger.error('Password reset function returned error', { data });
      return res.status(500).json({ 
        message: data?.message || 'Failed to update password'
      });
    }
    
  } catch (error) {
    logger.error('Reset password error', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      message: error.message || 'Failed to reset password',
      error: error.message
    });
  }
};

const sendOTP = async (req, res) => {
  try {
    logger.debug('Send OTP request received', { email: req.body.email });
    
    const { email } = req.body;

    if (!email) {
      logger.warn('Email missing in send OTP request');
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      logger.warn('Invalid email format in send OTP request', { error: emailValidation.error });
      return res.status(400).json({ message: emailValidation.error });
    }

    const sanitizedEmail = emailValidation.sanitized;

    // Check if user exists in users_profile table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users_profile')
      .select('user_id, email')
      .eq('email', sanitizedEmail)
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
      .eq('email', sanitizedEmail);

    if (otpError) {
      logger.error('Error updating OTP in database', { error: otpError.message });
      return res.status(500).json({ message: 'Failed to generate OTP' });
    }

    // Send OTP via email
    const emailResult = await sendOTPEmail(sanitizedEmail, otp);
    
    if (!emailResult.success) {
      logger.error('Failed to send OTP email', { error: emailResult.error });
      return res.status(500).json({ message: 'Failed to send verification code' });
    }

    logger.debug('OTP sent successfully', { email: sanitizedEmail });
    
    res.status(200).json({ 
      message: 'Verification code sent to your email successfully!' 
    });
    
  } catch (error) {
    logger.error('Send OTP error', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      message: 'Failed to send verification code',
      error: error.message
    });
  }
};


const login = async (req, res) => {
  try {
    logger.debug('Login request received', { employeeNumber: req.body.employeeNumber });
    const { employeeNumber, password } = req.body;
    if (!employeeNumber || !password) {
      logger.warn('Missing credentials in login request', { hasEmployeeNumber: !!employeeNumber, hasPassword: !!password });
      return res.status(400).json({ message: 'Employee number and password are required' });
    }

    // Validate employee number
    const employeeNumberValidation = validateEmployeeNumber(employeeNumber);
    if (!employeeNumberValidation.isValid) {
      logger.warn('Invalid employee number format in login request', { error: employeeNumberValidation.error });
      return res.status(400).json({ message: 'Invalid employee number format' });
    }

    const sanitizedEmployeeNumber = employeeNumberValidation.sanitized;
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
      .eq('employee_number', sanitizedEmployeeNumber)
      .is('deleted_at', null)
      .single();
    if (userError || !userData) {
      logger.warn('User not found during login', { employeeNumber: sanitizedEmployeeNumber, error: userError?.message });
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }
    if (userData.users_profile.deleted_at) {
      logger.warn('Login attempt for soft-deleted user', { employeeNumber: sanitizedEmployeeNumber });
      return res.status(403).json({ message: 'Account has been deactivated. Please contact administrator.' });
    }
    if (!userData.users_profile.is_active) {
      logger.warn('Login attempt for inactive user', { employeeNumber: sanitizedEmployeeNumber });
      return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
    }
    // Step 2: Check if auth user is soft-deleted before attempting login
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userData.users_profile.user_id);
    if (authUserError || !authUser.user) {
      logger.warn('Auth user not found during login', { employeeNumber: sanitizedEmployeeNumber, error: authUserError?.message });
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }
    if (authUser.user.banned_until || authUser.user.deleted_at) {
      logger.warn('Login attempt for banned/deleted auth user', { employeeNumber: sanitizedEmployeeNumber });
      return res.status(403).json({ message: 'Account has been deactivated. Please contact administrator.' });
    }
    // Step 3: Use the email from users_profile to authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.users_profile.email,
      password,
    });
    if (authError) {
      logger.warn('Authentication failed during login', { employeeNumber: sanitizedEmployeeNumber, error: authError.message });
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }
    // Step 4: Persist Supabase refresh token
    const sbRefreshToken = authData.session?.refresh_token;
    if (!sbRefreshToken) {
      logger.error('No Supabase refresh token found on login response', { employeeNumber: sanitizedEmployeeNumber });
      return res.status(500).json({ message: 'Login session missing refresh token' });
    }
    // Ensure any legacy cookie is removed so only sb_refresh_token remains
    clearRefreshTokenCookie(res);
    setSbRefreshTokenCookie(res, sbRefreshToken);
    
    // Step 5: Fetch barangay assignment for role 7 users (Barangay Officials)
    let barangayAssignment = null;
    if (userData.users_profile.role_id === 7) {
      try {
        logger.debug('Fetching barangay data for user profile', { userProfileId: userData.users_profile.id });
        // Get barangay official record
        const { data: barangayData, error: barangayError } = await supabaseAdmin
          .from('barangay_officials')
          .select('id, barangay_id')
          .eq('user_profile_id', userData.users_profile.id)
          .single();

        logger.debug('Raw barangay official data', { barangayData });
        
        if (barangayError) {
          logger.error('Error fetching barangay data during login', { error: barangayError.message });
        }

        logger.debug('Barangay data retrieved', { barangayData });
        if (!barangayError && barangayData) {
          logger.debug('Processing barangay assignment', { barangayId: barangayData.barangay_id });
          barangayAssignment = {
            assigned_barangay_id: barangayData.barangay_id || null
          };
          logger.debug('Final barangay assignment', { barangayAssignment });
        }
      } catch (barangayError) {
        logger.error('Error fetching barangay assignment during login', { error: barangayError.message });
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
    logger.debug('Final login response data', { userId: responseData.user.user_id, roleId: responseData.user.role_id });
    logger.info('Login successful', { employeeNumber: sanitizedEmployeeNumber, roleId: userData.users_profile.role_id });
    res.status(200).json(responseData);
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
// Refresh endpoint using Supabase refresh token
const refresh = async (req, res) => {
  try {
    const sbRefreshToken = req.cookies?.sb_refresh_token || req.body?.sb_refresh_token;
    if (!sbRefreshToken) {
      logger.warn('No refresh token provided in refresh request');
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: sbRefreshToken });
    if (error || !data?.session) {
      logger.warn('Invalid or expired refresh token', { error: error?.message });
      return res.status(401).json({ message: 'Invalid or expired refresh token', error: error?.message });
    }

    // If Supabase rotated the refresh token, update cookie
    const rotated = data.session.refresh_token;
    if (rotated && rotated !== sbRefreshToken) {
      setSbRefreshTokenCookie(res, rotated);
    }

    // Get user data from the session
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
      .eq('users_profile.user_id', data.session.user.id)
      .is('deleted_at', null)
      .single();

    if (userError || !userData) {
      logger.warn('User not found during token refresh', { userId: data.session.user.id, error: userError?.message });
      return res.status(401).json({ message: 'User not found' });
    }

    // Fetch barangay assignment for role 7 users
    let barangayAssignment = null;
    if (userData.users_profile.role_id === 7) {
      try {
        const { data: barangayData, error: barangayError } = await supabaseAdmin
          .from('barangay_officials')
          .select('id, barangay_id')
          .eq('user_profile_id', userData.users_profile.id)
          .single();

        if (!barangayError && barangayData) {
          barangayAssignment = {
            assigned_barangay_id: barangayData.barangay_id || null
          };
        }
      } catch (barangayError) {
        logger.error('Error fetching barangay assignment during token refresh', { error: barangayError.message });
      }
    }

    const responseData = {
      user: {
        user_id: userData.id,
        auth_id: data.session.user.id,
        email: userData.users_profile.email,
        employee_number: userData.employee_number,
        role_id: userData.users_profile.role_id,
        resident_id: userData.users_profile.resident_id,
        first_name: userData.users_profile.residents?.first_name,
        last_name: userData.users_profile.residents?.last_name,
        ...(barangayAssignment || {})
      },
      token: data.session.access_token
    };

    logger.info('Token refresh successful', { userId: userData.id, roleId: userData.users_profile.role_id });
    return res.status(200).json(responseData);
  } catch (error) {
    logger.error('Token refresh error', { error: error.message, stack: error.stack });
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Logout endpoint
const logout = async (req, res) => {
  try {
    // Clear both legacy and Supabase refresh cookies
    clearRefreshTokenCookie(res);
    clearSbRefreshTokenCookie(res);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error: error.message, stack: error.stack });
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
