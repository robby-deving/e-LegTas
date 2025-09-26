const { supabaseAdmin } = require('../config/supabase');

/**
 * Enhanced authentication middleware based on UserManagement component requirements
 * Provides robust authentication with role and profile information
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

    // Query the users table for the authenticated user
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        users_profile_id,
        employee_number,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return res.status(404).json({
        message: 'User not found in users table',
        error: userError?.message || 'User does not exist',
      });
    }

    // Optionally, fetch additional profile information
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select(`
        id,
        role_id,
        is_active,
        email,
        resident_id
      `)
      .eq('id', userRecord.users_profile_id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({
        message: 'User profile not found',
        error: profileError?.message || 'Profile does not exist',
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
      id: userRecord.id,
      employee_number: userRecord.employee_number,
      role_id: userProfile.role_id,
      email: userProfile.email,
      is_active: userProfile.is_active,
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
  basicAuth
};