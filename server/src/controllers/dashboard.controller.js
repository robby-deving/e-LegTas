//dashboard.controller.js

const supabase = require('../config/supabase');

// --- Helper for Custom API Errors ---
class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

// --- Controller Functions ---

/**
 * @desc Count active evacuation centers for a specific disaster
 * @route GET /api/v1/dashboard/evacuation-centers/:disasterId
 * @access Public
 */
exports.getActiveEvacuationCentersByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;

    try {
        const { data, error } = await supabase
            .from('disaster_evacuation_event')
            .select(`
                evacuation_center_id
            `)
            .eq('disaster_id', disasterId)
            .is('evacuation_end_date', null); // still active

        if (error) {
            console.error('Supabase Error (getActiveEvacuationCentersByDisaster):', error);
            return next(new ApiError('Failed to retrieve evacuation center data.', 500));
        }

        if (!data || data.length === 0) {
            return res.status(200).json({
                message: 'No active evacuation centers found for this disaster.',
                count: 0,
                data: [],
            });
        }

        // Use Set to count unique evacuation_center_ids
        const uniqueCenterIds = [...new Set(data.map(entry => entry.evacuation_center_id))];

        res.status(200).json({
            message: 'Successfully counted active evacuation centers for this disaster.',
            count: uniqueCenterIds.length,
            evacuation_center_ids: uniqueCenterIds
        });

    } catch (err) {
        next(new ApiError('Internal server error during evacuation center count.', 500));
    }
};

/**
 * @desc Count total registered evacuees for a specific disaster
 * @route GET /api/v1/dashboard/registered-evacuees/:disasterId
 * @access Public
 */
exports.getTotalRegisteredEvacueesByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;

    try {
        // Get active disaster_evacuation_event IDs
        const { data: activeEvents, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id')
            .eq('disaster_id', disasterId)
            .is('evacuation_end_date', null); // still active

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to fetch active evacuation events.', 500));
        }

        if (!activeEvents || activeEvents.length === 0) {
            return res.status(200).json({
                message: 'No active evacuation events found for this disaster.',
                count: 0,
                data: [],
            });
        }

        const eventIds = activeEvents.map(ev => ev.id);

        // Query summaries for those events
        const { data: summaries, error: summaryError } = await supabase
            .from('evacuation_summaries')
            .select('total_no_of_individuals')
            .in('disaster_evacuation_event_id', eventIds);

        if (summaryError) {
            console.error('Supabase Error (evacuation summaries):', summaryError);
            return next(new ApiError('Failed to fetch evacuation summaries.', 500));
        }

        // Compute total
        const totalRegistered = summaries.reduce((sum, entry) => {
            return sum + (entry.total_no_of_individuals || 0);
        }, 0);

        res.status(200).json({
            message: 'Successfully counted total registered evacuees for this disaster.',
            count: totalRegistered,
        });

    } catch (err) {
        next(new ApiError('Internal server error during evacuee count.', 500));
    }
};

/**
 * @desc Count total registered families for a specific disaster
 * @route GET /api/v1/dashboard/registered-families/:disasterId
 * @access Public
 */
exports.getTotalRegisteredFamiliesByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;

    try {
        // Get active evacuation event IDs
        const { data: activeEvents, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id')
            .eq('disaster_id', disasterId)
            .is('evacuation_end_date', null);

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to fetch active evacuation events.', 500));
        }

        if (!activeEvents || activeEvents.length === 0) {
            return res.status(200).json({
                message: 'No active evacuation events found for this disaster.',
                count: 0,
                data: [],
            });
        }

        const eventIds = activeEvents.map(ev => ev.id);

        // Fetch family totals from summaries
        const { data: summaries, error: summaryError } = await supabase
            .from('evacuation_summaries')
            .select('total_no_of_family')
            .in('disaster_evacuation_event_id', eventIds);

        if (summaryError) {
            console.error('Supabase Error (evacuation summaries):', summaryError);
            return next(new ApiError('Failed to fetch family totals.', 500));
        }

        // Compute total
        const totalFamilies = summaries.reduce((sum, entry) => {
            return sum + (entry.total_no_of_family || 0);
        }, 0);

        res.status(200).json({
            message: 'Successfully counted total registered families for this disaster.',
            count: totalFamilies,
        });

    } catch (err) {
        next(new ApiError('Internal server error during family count.', 500));
    }
};

/**
 * @desc Get evacuee statistics by demographic/vulnerability type for a disaster
 * @route GET /api/v1/dashboard/evacuee-statistics/:disasterId
 * @access Public
 */
exports.getEvacueeStatisticsByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;

    try {
        // Fetch active evacuation event IDs for the disaster
        const { data: activeEvents, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id')
            .eq('disaster_id', disasterId)
            .is('evacuation_end_date', null);

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to fetch active evacuation events.', 500));
        }

        if (!activeEvents || activeEvents.length === 0) {
            return res.status(200).json({
                message: 'No active evacuation events found for this disaster.',
                statistics: {},
            });
        }

        const eventIds = activeEvents.map(ev => ev.id);

        // Fetch relevant demographic fields from summaries
        const { data: summaries, error: summaryError } = await supabase
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
            .in('disaster_evacuation_event_id', eventIds);

        if (summaryError) {
            console.error('Supabase Error (evacuation summaries):', summaryError);
            return next(new ApiError('Failed to fetch evacuee statistics.', 500));
        }

        // Aggregate totals by vulnerability type
        const aggregatedStats = summaries.reduce((totals, entry) => {
            for (const key in entry) {
                totals[key] = (totals[key] || 0) + (entry[key] || 0);
            }
            return totals;
        }, {});

        res.status(200).json({
            message: 'Successfully retrieved evacuee statistics for this disaster.',
            statistics: aggregatedStats,
        });

    } catch (err) {
        next(new ApiError('Internal server error during evacuee statistics aggregation.', 500));
    }
};

/**
 * @desc Get ranked evacuation center capacity status for a disaster
 * @route GET /api/v1/dashboard/capacity-status/:disasterId
 * @access Public
 */
exports.getEvacuationCenterCapacityStatus = async (req, res, next) => {
    const { disasterId } = req.params;

    try {
        // Get active evacuation events for the disaster
        const { data: activeEvents, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id, evacuation_center_id')
            .eq('disaster_id', disasterId)
            .is('evacuation_end_date', null);

        if (eventError) {
            console.error('Supabase Error (active events):', eventError);
            return next(new ApiError('Failed to retrieve active evacuation events.', 500));
        }

        if (!activeEvents || activeEvents.length === 0) {
            return res.status(200).json({
                message: 'No active evacuation centers found for this disaster.',
                data: [],
            });
        }

        const evacEventIds = activeEvents.map(event => event.id);
        const centerIds = [...new Set(activeEvents.map(event => event.evacuation_center_id))];

        // Get evacuee counts from evacuation_summaries
        const { data: summaries, error: summaryError } = await supabase
            .from('evacuation_summaries')
            .select('disaster_evacuation_event_id, total_no_of_individuals')
            .in('disaster_evacuation_event_id', evacEventIds);

        if (summaryError) {
            console.error('Supabase Error (evacuation_summaries):', summaryError);
            return next(new ApiError('Failed to retrieve summaries.', 500));
        }

        // Map centerId → evacuee count
        const occupancyMap = {};
        for (const summary of summaries) {
            const event = activeEvents.find(e => e.id === summary.disaster_evacuation_event_id);
            if (!event) continue;
            const centerId = event.evacuation_center_id;
            occupancyMap[centerId] = (occupancyMap[centerId] || 0) + (summary.total_no_of_individuals || 0);
        }

        // Get center details (name, address)
        const { data: centers, error: ecError } = await supabase
            .from('evacuation_centers')
            .select(`
                id,
                name,
                total_capacity,
                address,
                barangay_id,
                barangay:barangay_id (name)
            `)
            .in('id', centerIds);

        if (ecError) {
            console.error('Supabase Error (evacuation_centers):', ecError);
            return next(new ApiError('Failed to fetch evacuation center info.', 500));
        }

        // Build response list
        const rankedCenters = centers.map(center => {
            const centerId = center.id;
            return {
                id: centerId,
                name: center.name,
                barangay_name: center.barangay?.name || 'Unknown',
                total_capacity: center.total_capacity || 0,
                current_occupancy: occupancyMap[centerId] || 0
            };
        }).sort((a, b) => b.current_occupancy - a.current_occupancy);

        res.status(200).json({
            message: 'Successfully fetched evacuation center capacity status.',
            data: rankedCenters,
        });

    } catch (err) {
        next(new ApiError('Internal server error during capacity status aggregation.', 500));
    }
};

/**
 * @desc Get all active disasters
 * @route GET /api/v1/dashboard/disasters
 * @access Public
 */

exports.getActiveDisasters = async (req, res) => {
  const { data, error } = await supabase
    .from('disasters')
    .select(`
      id,
      disaster_name,
      disaster_start_date,
      disaster_end_date,
      disaster_types ( name )
    `)
    .not('disaster_start_date', 'is', null)  // has started
    .is('disaster_end_date', null)           // still ongoing
    .order('disaster_start_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json(data);
};





