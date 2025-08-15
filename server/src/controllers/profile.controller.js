// controllers/profile.controller.js

const { supabase } = require('../config/supabase');

const TABLE_NAME = 'users';

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

        // Query: join users -> users_profile -> residents
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                id,
                employee_number,
                users_profile (
                    email,
                    phone_number,
                    residents (
                        first_name,
                        last_name
                    )
                )
            `)
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Supabase Error (getUserProfile):', error);
            return next(new ApiError('Failed to retrieve user profile.', 500));
        }

        if (!data) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Transform: flatten nested objects
        const profileData = {
            user_id: data.id,
            employee_number: data.employee_number,
            email: data.users_profile?.email || null,
            phone_number: data.users_profile?.phone_number || null,
            first_name: data.users_profile?.residents?.first_name || null,
            last_name: data.users_profile?.residents?.last_name || null
        };

        res.status(200).json({
            message: 'Successfully retrieved user profile.',
            data: profileData
        });
    } catch (err) {
        console.error('Unexpected Error (getUserProfile):', err);
        next(new ApiError('Internal server error during getUserProfile.', 500));
    }
};