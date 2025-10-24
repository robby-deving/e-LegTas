// controllers/profile.controller.js

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

// --- Helper for Custom API Errors ---
class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

/**
 * @desc Get profile of logged-in user
 * @route GET /api/v1/profile/:userId
 * @access Private
 */
exports.getUserProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('users')
            .select(`
                id,
                employee_number,
                users_profile (
                    email,
                    phone_number,
                    role_id,
                    roles (role_name),
                    residents (
                        first_name,
                        last_name
                    )
                )
            `)
            .eq('id', userId)
            .single();

        if (error) {
            logger.error('Supabase Error (getUserProfile):', { error: error.message, stack: error.stack });
            return next(new ApiError('Failed to retrieve user profile.', 500));
        }

        if (!data) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Flatten with null safety
        const profileData = {
            user_id: data.id,
            employee_number: data.employee_number || null,
            email: data.users_profile?.email || null,
            phone_number: data.users_profile?.phone_number || null,
            first_name: data.users_profile?.residents?.first_name || null,
            last_name: data.users_profile?.residents?.last_name || null,
            role: data.users_profile?.roles?.role_name || null 
        };

        res.status(200).json({
            message: 'Successfully retrieved user profile.',
            data: profileData
        });
    } catch (err) {
        logger.error('Unexpected Error (getUserProfile):', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during getUserProfile.', 500));
    }
};

/**
 * @desc Update profile of logged-in user
 * @route PUT /api/v1/profile/:userId
 * @access Private
 */
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { email, phone_number, first_name, last_name } = req.body;

    // Step 1: Fetch the user's profile to get users_profile.id and residents.id
    const { data: existingData, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        users_profile (
          id,
          email,
          phone_number,
          residents (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (fetchError) {
      logger.error('Supabase Error (fetch profile before update):', { error: fetchError.message, stack: fetchError.stack });
      return next(new ApiError('Failed to fetch user profile before update.', 500));
    }

    if (!existingData) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const profileId = existingData.users_profile?.id;
    const residentId = existingData.users_profile?.residents?.id;

    // Step 2: Update users_profile table
    if (profileId) {
      const { error: updateProfileError } = await supabase
        .from('users_profile')
        .update({
          email: email ?? existingData.users_profile.email,
          phone_number: phone_number ?? existingData.users_profile.phone_number
        })
        .eq('id', profileId);

      if (updateProfileError) {
        logger.error('Supabase Error (update users_profile):', { error: updateProfileError.message, stack: updateProfileError.stack });
        return next(new ApiError('Failed to update user profile details.', 500));
      }
    }

    // Step 3: Update residents table
    if (residentId) {
      const { error: updateResidentError } = await supabase
        .from('residents')
        .update({
          first_name: first_name ?? existingData.users_profile.residents.first_name,
          last_name: last_name ?? existingData.users_profile.residents.last_name
        })
        .eq('id', residentId);

      if (updateResidentError) {
        logger.error('Supabase Error (update residents):', { error: updateResidentError.message, stack: updateResidentError.stack });
        return next(new ApiError('Failed to update resident details.', 500));
      }
    }

    res.status(200).json({
      message: 'Successfully updated user profile.'
    });
  } catch (err) {
    logger.error('Unexpected Error (updateUserProfile):', { error: err.message, stack: err.stack });
    next(new ApiError('Internal server error during updateUserProfile.', 500));
  }
};