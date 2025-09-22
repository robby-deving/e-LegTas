// server/src/controllers/evacuees.event-details.controller.js
const { supabase } = require('../config/supabase');

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
  const disasterEvacuationEventId = Number(
    req.params.disasterEvacuationEventId ?? req.params.id
  );

  if (!Number.isFinite(disasterEvacuationEventId)) {
    return next(new ApiError('Invalid disaster evacuation event id.', 400));
  }

  try {
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
      console.error('[event-details] supabase error:', eventError);
      return next(new ApiError('Failed to fetch disaster evacuation event.', 500));
    }
    if (!eventData) {
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
      console.error('[event-details] summary error:', summaryError);
      return next(new ApiError('Failed to fetch evacuation summary.', 500));
    }

    const safeSummary = {
      total_no_of_family: summary?.total_no_of_family ?? 0,
      total_no_of_individuals: summary?.total_no_of_individuals ?? 0,
      evacuation_center_capacity: ec?.total_capacity ?? 0,
    };

    return res.status(200).json({
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
    });
  } catch (err) {
    console.error('[event-details] fatal:', err);
    return next(new ApiError('Internal server error', 500));
  }
};
