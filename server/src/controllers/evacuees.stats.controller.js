// server/src/controllers/evacuees.stats.controller.js
const { supabase } = require('../config/supabase');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * @desc Get evacuee demographic statistics by disaster evacuation event ID
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuee-statistics
 */
exports.getEvacueeStatisticsByDisasterEvacuationEventId = async (req, res, next) => {
  const eventId = Number(req.params.disasterEvacuationEventId ?? req.params.id);
  if (!Number.isFinite(eventId)) {
    return next(new ApiError('Invalid disaster evacuation event id.', 400));
  }

  try {
    const { data, error } = await supabase
      .from('evacuation_summaries')
      .select(`
        total_no_of_male,
        total_no_of_female,
        total_no_of_infant,
        total_no_of_children,
        total_no_of_youth,
        total_no_of_adult,
        total_no_of_seniors,
        total_no_of_pwd,
        total_no_of_pregnant,
        total_no_of_lactating_women
      `)
      .eq('disaster_evacuation_event_id', eventId)
      .maybeSingle();

    if (error) {
      console.error('[ERROR] fetching evacuee statistics:', error);
      return next(new ApiError('Failed to fetch evacuee statistics.', 500));
    }

    const summary = {
      total_no_of_male:            data?.total_no_of_male ?? 0,
      total_no_of_female:          data?.total_no_of_female ?? 0,
      total_no_of_infant:          data?.total_no_of_infant ?? 0,
      total_no_of_children:        data?.total_no_of_children ?? 0,
      total_no_of_youth:           data?.total_no_of_youth ?? 0,
      total_no_of_adult:           data?.total_no_of_adult ?? 0,
      total_no_of_seniors:         data?.total_no_of_seniors ?? 0,
      total_no_of_pwd:             data?.total_no_of_pwd ?? 0,
      total_no_of_pregnant:        data?.total_no_of_pregnant ?? 0,
      total_no_of_lactating_women: data?.total_no_of_lactating_women ?? 0,
    };

    return res.status(200).json({ title: 'Evacuees Statistics', summary });
  } catch (err) {
    console.error('[FATAL] evacuee-statistics:', err);
    return next(new ApiError('Internal server error.', 500));
  }
};
