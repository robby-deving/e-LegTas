// server/src/controllers/evacuees.barangays.controller.js
const { supabase } = require('../config/supabase');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * @desc Get all barangay entries
 * @route GET /api/v1/evacuees/barangays  
 * @access Public
 */
exports.getAllBarangays = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('barangays').select('*');

    if (error) {
      console.error('[getAllBarangays] Supabase error:', error);
      return next(new ApiError('Failed to retrieve barangay entries.', 500));
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ message: 'No barangay entries found.', data: [] });
    }

    return res.status(200).json({
      message: 'Successfully retrieved all barangay entries.',
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('[getAllBarangays] Internal error:', err);
    return next(new ApiError('Internal server error during getAllBarangays.', 500));
  }
};
