const { supabase } = require('../config/supabase');

class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * @desc Get list of all barangays
 * @route GET /api/v1/barangays
 * @access Public
 */
exports.getBarangays = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('barangays')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase Error (getBarangays):', error);
            return next(new ApiError('Failed to retrieve barangays.', 500));
        }

        res.status(200).json({
            message: 'Successfully retrieved barangays.',
            count: data.length,
            data: data
        });
    } catch (err) {
        console.error('Error in getBarangays:', err);
        next(new ApiError('Internal server error during getBarangays.', 500));
    }
}; 