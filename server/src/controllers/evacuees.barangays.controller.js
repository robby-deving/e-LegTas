// server/src/controllers/evacuees.barangays.controller.js
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

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
      logger.error('[getAllBarangays] Supabase error', { error: error.message, details: error });
      return next(new ApiError('Failed to retrieve barangay entries.', 500));
    }

    if (!data || data.length === 0) {
      logger.info('[getAllBarangays] No barangay entries found');
      return res.status(200).json({ message: 'No barangay entries found.', data: [] });
    }

    logger.info('[getAllBarangays] Retrieved barangays', { count: data.length });
    logger.debug('[getAllBarangays] Barangays data', { data });

    return res.status(200).json({
      message: 'Successfully retrieved all barangay entries.',
      count: data.length,
      data,
    });
  } catch (err) {
    logger.error('[getAllBarangays] Internal server error', { error: err.message, stack: err.stack });
    return next(new ApiError('Internal server error during getAllBarangays.', 500));
  }
};
