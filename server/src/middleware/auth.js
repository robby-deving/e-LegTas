const { supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');

/**
 * Optimized authentication middleware using custom JWT claims
 * Extracts user data from JWT token claims instead of making database queries
 * Requires custom_access_token_hook to be configured in Supabase
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check for Authorization header with Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'No valid authorization header found',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        message: 'Invalid authentication token',
        error: error?.message || 'Token verification failed',
      });
    }

    // Decode JWT to extract custom claims from the payload
    // Custom claims are in the JWT payload, not in the user object from getUser()
    let decodedToken;
    try {
      // Decode without verification (already verified by Supabase above)
      decodedToken = jwt.decode(token);
    } catch (decodeError) {
      console.error('JWT decode error:', decodeError);
      return res.status(401).json({
        message: 'Invalid token format',
        error: 'Failed to decode JWT token',
      });
    }

    // Extract custom claims from the decoded JWT payload
    const userProfileId = decodedToken?.user_profile_id;
    const roleId = decodedToken?.role_id;
    const isActive = decodedToken?.is_active;
    const email = decodedToken?.email || user.email;
    const appUserId = decodedToken?.app_user_id;
    const employeeNumber = decodedToken?.employee_number;
    const residentId = decodedToken?.resident_id;

    // Validate that custom claims exist (fallback to database query if not configured)
    if (userProfileId === undefined || userProfileId === null) {
      console.warn('Custom claims not found in JWT. Falling back to database query. Please configure custom_access_token_hook in Supabase.');
      return await authenticateUserLegacy(req, res, next);
    }

    // Check if user profile exists
    if (!userProfileId) {
      return res.status(404).json({
        message: 'User profile not found',
        error: 'No user profile associated with this account',
      });
    }

    // Check if user is active
    if (!isActive) {
      return res.status(403).json({
        message: 'User account is inactive',
        error: 'Account has been deactivated',
      });
    }

    // Set user information in the request object (from claims - no DB query needed!)
    req.user = {
      id: appUserId,                  // bigint ID from users table
      uuid: user.id,                  // UUID from Supabase Auth
      user_profile_id: userProfileId, // bigint ID from users_profile table
      employee_number: employeeNumber,
      role_id: roleId,
      email: email,
      is_active: isActive,
      resident_id: residentId,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

/**
 * Legacy authentication middleware (fallback for when custom claims are not configured)
 * This performs database queries like the old implementation
 * @private
 */
const authenticateUserLegacy = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        message: 'Invalid authentication token',
        error: error?.message || 'Token verification failed',
      });
    }

    // First, find the users_profile using the UUID from Supabase Auth
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select(`
        id,
        role_id,
        is_active,
        email,
        resident_id
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({
        message: 'User profile not found',
        error: profileError?.message || 'Profile does not exist',
      });
    }

    // Then, find the users record using the user_profile_id
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        user_profile_id,
        employee_number,
        created_at,
        updated_at
      `)
      .eq('user_profile_id', userProfile.id)
      .single();

    if (userError || !userRecord) {
      return res.status(404).json({
        message: 'User not found in users table',
        error: userError?.message || 'User does not exist',
      });
    }

    // Check if user is active
    if (!userProfile.is_active) {
      return res.status(403).json({
        message: 'User account is inactive',
        error: 'Account has been deactivated',
      });
    }

    // Set user information in the request object
    req.user = {
      id: userRecord.id,              // bigint ID from users table
      uuid: user.id,                  // UUID from Supabase Auth
      user_profile_id: userProfile.id,
      employee_number: userRecord.employee_number,
      role_id: userProfile.role_id,
      email: userProfile.email,
      is_active: userProfile.is_active,
      resident_id: userProfile.resident_id,
    };

    next();
  } catch (error) {
    console.error('Legacy authentication middleware error:', error);
    return res.status(500).json({
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

/**
 * Simplified auth check for basic authentication without full profile
 */
const basicAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'];
    
    if (userIdHeader) {
      req.user = { id: userIdHeader };
      return next();
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'No valid authorization header found'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        message: 'Invalid authentication token',
        error: error?.message || 'Token verification failed'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Basic authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message
    });
  }
};

module.exports = {
  authenticateUser,
  basicAuth,
  authenticateUserLegacy // Exported for testing/fallback purposes
};