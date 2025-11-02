// evacuees.services.controller.js
// Import the centralized Supabase client
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

// Define the table name for services
const TABLE_NAME = 'services';

// --- Helper for Custom API Errors ---
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * @desc Add a new service record for a family
 * @route POST /api/v1/evacuees/services
 * @access Private (requires authentication/authorization)
 */
exports.addService = async (req, res, next) => {
  // Use validated body from middleware if available
  const validatedData = req.validatedBody || req.body;
  
  const {
    disaster_evacuation_event_id,
    family_id,
    service_received,
    added_by,
  } = validatedData;

  // Check required fields
  if (!disaster_evacuation_event_id || !family_id || !service_received) {
    logger.warn('Missing required fields for service record', {
      disaster_evacuation_event_id,
      family_id,
      has_service_received: !!service_received,
    });
    return next(new ApiError('Missing required fields for service record.', 400));
  }

  if (!added_by) {
    logger.warn('User authentication required for addService', { added_by });
    return next(new ApiError('User authentication required.', 401));
  }

  const newServiceEntry = {
    disaster_evacuation_event_id: Number(disaster_evacuation_event_id),
    family_id: Number(family_id),
    service_received,
    added_by: Number(added_by),
    created_at: new Date().toISOString(),
  };

  try {
    logger.debug('Creating service record', { newServiceEntry });

    // Insert new service record
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([newServiceEntry])
      .select();

    if (error) {
      logger.error('Supabase Error (addService)', { error });
      if (error.code === '23503') {
        logger.warn('Foreign key constraint failed on addService', {
          code: error.code,
          details: error.details,
        });
        return next(
          new ApiError(
            'Foreign key constraint failed (e.g., family_id or event_id does not exist).',
            400
          )
        );
      }
      return next(new ApiError('Failed to create service record.', 500));
    }

    logger.info('Service record created successfully', {
      id: data?.[0]?.id,
      family_id: newServiceEntry.family_id,
      disaster_evacuation_event_id: newServiceEntry.disaster_evacuation_event_id,
    });

    res.status(201).json({
      message: 'Service record created successfully.',
      data: data[0],
    });
  } catch (err) {
    logger.error('Internal server error during addService', {
      message: err?.message,
      stack: err?.stack,
    });
    next(new ApiError('Internal server error during addService.', 500));
  }
};
