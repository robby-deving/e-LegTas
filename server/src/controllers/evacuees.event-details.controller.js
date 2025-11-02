// server/src/controllers/evacuees.event-details.controller.js
const { supabase } = require('../config/supabase');
const { validateId } = require('../utils/validateInput');
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

// --- Helper: build full name safely (first [middle] last [suffix]) ---
function buildFullName({ first_name, middle_name, last_name, suffix }) {
  const parts = [
    first_name?.trim(),
    middle_name?.trim(),
    last_name?.trim(),
    suffix?.trim(),
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * @desc Get disaster + evacuation center info for a disaster evacuation event (empty-state friendly)
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/details
 * @access Public
 */
exports.getDisasterEvacuationDetails = async (req, res, next) => {
  // Use validated params from middleware if available, otherwise validate manually
  let disasterEvacuationEventId = req.validatedParams?.disasterEvacuationEventId;
  
  if (!disasterEvacuationEventId) {
    // Fallback validation if middleware not used
    const rawId = req.params.disasterEvacuationEventId ?? req.params.id;
    const idValidation = validateId(rawId, 'integer');

    if (!idValidation.isValid) {
      logger.warn('Invalid disaster evacuation event ID provided', {
        path: req.path,
        providedId: rawId,
        error: idValidation.error,
        ip: req.ip
      });
      return next(new ApiError(idValidation.error, 400));
    }

    disasterEvacuationEventId = idValidation.sanitized;
  }

  try {
    logger.info('Fetching disaster evacuation event details', {
      disasterEvacuationEventId,
      path: req.path,
      ip: req.ip
    });

    // 1) Event + related disaster + EC
    const { data: eventData, error: eventError } = await supabase
      .from('disaster_evacuation_event')
      .select(`
        id,
        evacuation_start_date,
        evacuation_end_date,
        disasters (
          id,
          disaster_name,
          disaster_start_date,
          disaster_end_date,
          disaster_types ( id, name )
        ),
        evacuation_centers (
          id,
          name,
          barangay_id,
          total_capacity,
          barangays ( id, name )
        )
      `)
      .eq('id', disasterEvacuationEventId)
      .maybeSingle();

    if (eventError) {
      logger.error('Failed to fetch disaster evacuation event', {
        disasterEvacuationEventId,
        error: eventError,
        path: req.path
      });
      return next(new ApiError('Failed to fetch disaster evacuation event.', 500));
    }
    if (!eventData) {
      logger.warn('Disaster evacuation event not found', {
        disasterEvacuationEventId,
        path: req.path
      });
      return next(new ApiError('Disaster evacuation event not found.', 404));
    }

    const disasters = eventData.disasters ?? null;
    const ec = eventData.evacuation_centers ?? null;

    // 2) Summary (ok if missing — return zeros)
    const { data: summary, error: summaryError } = await supabase
      .from('evacuation_summaries')
      .select(`total_no_of_family, total_no_of_individuals`)
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId)
      .maybeSingle();

    if (summaryError) {
      logger.error('Failed to fetch evacuation summary', {
        disasterEvacuationEventId,
        error: summaryError,
        path: req.path
      });
      return next(new ApiError('Failed to fetch evacuation summary.', 500));
    }

    const safeSummary = {
      total_no_of_family: summary?.total_no_of_family ?? 0,
      total_no_of_individuals: summary?.total_no_of_individuals ?? 0,
      evacuation_center_capacity: ec?.total_capacity ?? 0,
    };

    logger.info('[event-details] Retrieved event details', { disasterEvacuationEventId, hasSummary: !!summary, hasDisaster: !!disasters, hasCenter: !!ec });
    logger.debug('[event-details] Response payload preview', {
      eventId: eventData.id,
      summary: safeSummary,
      centerId: ec?.id ?? null,
      disasterId: disasters?.id ?? null,
    });

    const responseData = {
      evacuation_event: {
        id: eventData.id,
        evacuation_start_date: eventData.evacuation_start_date ?? null,
        evacuation_end_date: eventData.evacuation_end_date ?? null,
        is_event_ended: Boolean(eventData.evacuation_end_date),
      },
      disaster: {
        disaster_types_id: disasters?.disaster_types?.id ?? null,
        disaster_type_name: disasters?.disaster_types?.name ?? 'Unknown',
        disasters_id: disasters?.id ?? null,
        disaster_name: disasters?.disaster_name ?? 'Unknown',
        disaster_start_date: disasters?.disaster_start_date ?? null,
        disaster_end_date: disasters?.disaster_end_date ?? null,
      },
      evacuation_center: {
        evacuation_center_id: ec?.id ?? null,
        evacuation_center_name: ec?.name ?? 'Unknown',
        evacuation_center_barangay_id: ec?.barangay_id ?? null,
        evacuation_center_barangay_name: ec?.barangays?.name ?? 'Unknown',
      },
      evacuation_summary: safeSummary,
    };

    logger.info('Successfully retrieved disaster evacuation event details', {
      disasterEvacuationEventId,
      path: req.path
    });

    return res.status(200).json(responseData);
  } catch (err) {
    logger.error('Fatal error in getDisasterEvacuationDetails', {
      disasterEvacuationEventId,
      error: err.message,
      stack: err.stack,
      path: req.path
    });
    logger.error('[event-details] Internal server error', { error: err.message, stack: err.stack, disasterEvacuationEventId });
    return next(new ApiError('Internal server error', 500));
  }
};