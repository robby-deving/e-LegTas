const { supabaseAdmin } = require('../config/supabase');

/**
 * Enhanced authentication middleware based on UserManagement component requirements
 * Provides robust authentication with role and profile information
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'];
    
    // Debug logging
    console.log('Auth middleware - Headers:', {
      authorization: authHeader ? 'Bearer [token]' : 'None',
      'x-user-id': userIdHeader || 'None'
    });
    
    // Check if we have a user ID directly from header (for testing/development)
    if (userIdHeader) {
      console.log('Using x-user-id header for auth:', userIdHeader);
      
      // Get comprehensive user profile information
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users_profile')
        .select(`
          id,
          user_id,
          role_id,
          is_active,
          email,
          resident_id,
          roles (
            id,
            role_name
          ),
          residents (
            first_name,
            middle_name,
            last_name,
            suffix
          )
        `)
        .eq('user_id', userIdHeader)
        .single();

      if (profileError || !userProfile) {
        return res.status(404).json({ 
          message: 'User profile not found',
          error: profileError?.message || 'Profile does not exist'
        });
      }

      // Check if user is active
      if (!userProfile.is_active) {
        return res.status(403).json({ 
          message: 'User account is inactive',
          error: 'Account has been deactivated'
        });
      }

      // Set comprehensive user information
      req.user = { 
        id: userIdHeader,
        role_id: userProfile.role_id,
        role_name: userProfile.roles?.role_name,
        email: userProfile.email,
        first_name: userProfile.residents?.first_name,
        last_name: userProfile.residents?.last_name,
        middle_name: userProfile.residents?.middle_name,
        suffix: userProfile.residents?.suffix,
        is_active: userProfile.is_active,
        profile: userProfile
      };
      
      return next();
    }
    
    // Check for Authorization header with Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid Authorization header found');
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'No valid authorization header found'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if supabaseAdmin is properly initialized
    if (!supabaseAdmin || !supabaseAdmin.auth) {
      console.error('Supabase admin client not properly initialized');
      return res.status(500).json({ 
        message: 'Authentication service unavailable',
        error: 'Server configuration error'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        message: 'Invalid authentication token',
        error: error?.message || 'Token verification failed'
      });
    }

    // Get comprehensive user profile information
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select(`
        id,
        user_id,
        role_id,
        is_active,
        email,
        resident_id,
        roles (
          id,
          role_name
        ),
        residents (
          first_name,
          middle_name,
          last_name,
          suffix
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ 
        message: 'User profile not found',
        error: profileError?.message || 'Profile does not exist'
      });
    }

    // Check if user is active
    if (!userProfile.is_active) {
      return res.status(403).json({ 
        message: 'User account is inactive',
        error: 'Account has been deactivated'
      });
    }

    // Set only necessary user information
    req.user = { 
      id: user.id,
      email: userProfile.email,
      role_id: userProfile.role_id
    };
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message
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