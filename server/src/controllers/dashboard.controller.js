//dashboard.controller.js

const { supabase } = require('../config/supabase');

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
    const { from, to } = req.query;

    try {
        let query = supabase
        .from('disaster_evacuation_event')
        .select(`evacuation_center_id`)
        .eq('disaster_id', disasterId);

        if (from && to) {
        // Historical filter: include centers active at any point in range
        query = query
            .lte('evacuation_start_date', to) // started on/before range end
            .or(`evacuation_end_date.gte.${from},evacuation_end_date.is.null`); // no end or ended after range start
        } else {
        // Live data (current active only)
        query = query.is('evacuation_end_date', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase Error (getActiveEvacuationCentersByDisaster):', error);
            return next(new ApiError('Failed to retrieve evacuation center data.', 500));
        }

        if (!data?.length) {
            return res.status(200).json({
                message: 'No active evacuation centers found for this disaster.',
                count: 0,
                data: [],
            });
        }

        // Use Set to count unique evacuation_center_ids
        const uniqueCenterIds = [...new Set(data.map(e => e.evacuation_center_id))];

        res.status(200).json({
            message: 'Successfully counted active evacuation centers for this disaster.',
            count: uniqueCenterIds.length,
            evacuation_center_ids: uniqueCenterIds
        });

    } catch (err) {
        console.error(err);
        next(new ApiError('Internal server error during evacuation center count.', 500));
    }
};

/**
 * @desc Count total registered evacuees for a specific disaster
 *       Live = evacuation_summaries
 *       Filtered = evacuation_registrations (by arrival_timestamp)
 * @route GET /api/v1/dashboard/registered-evacuees/:disasterId?from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public
 */
exports.getTotalRegisteredEvacueesByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;
    const { from, to } = req.query; // optional date filter

    try {
        // (1) Get active disaster_evacuation_event IDs
        const { data: events, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id, evacuation_end_date')
            .eq('disaster_id', disasterId);

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to fetch active evacuation events.', 500));
        }

        if (!events || events.length === 0) {
            return res.status(200).json({ count: 0 });
        }

        const eventIds = events.map(ev => ev.id);

        // (2️) If filter dates are provided → use evacuation_registrations
        if (from && to) {
          const { data: registrations, error: regError } = await supabase
            .from('evacuation_registrations')
            .select('id') // we only need count
            .in('disaster_evacuation_event_id', eventIds)
            .gte('arrival_timestamp', from)
            .lte('arrival_timestamp', to);

            if (regError) {
                console.error('Supabase Error (registrations):', regError);
                return next(new ApiError('Failed to fetch filtered registrations.', 500));
            }

            return res.status(200).json({
                message: 'Filtered evacuees count by arrival date.',
                count: registrations.length || 0,
            });
            }            

        // (3) Otherwise → live data from evacuation_summaries
        const activeEventIds = events
        .filter(ev => ev.evacuation_end_date === null)
        .map(ev => ev.id);

        if (activeEventIds.length === 0) {
        return res.status(200).json({ count: 0 });
        }

        // Query summaries for those events
        const { data: summaries, error: summaryError } = await supabase
            .from('evacuation_summaries')
            .select('total_no_of_individuals')
            .in('disaster_evacuation_event_id', activeEventIds);

        if (summaryError) {
            console.error('Supabase Error (evacuation summaries):', summaryError);
            return next(new ApiError('Failed to fetch evacuation summaries.', 500));
        }

        // Compute total
        const totalRegistered = summaries.reduce(
          (sum, entry) => sum + (entry.total_no_of_individuals || 0),
          0
        );

        res.status(200).json({
            message: 'Live evacuees count from summaries.',
            count: totalRegistered,
        });

    } catch (err) {
        next(new ApiError('Internal server error during evacuee count.', 500));
    }
};

/**
 * @desc Count total registered families for a specific disaster
 *       Live = evacuation_summaries
 *       Filtered = evacuation_registrations (by arrival_timestamp)
 * @route GET /api/v1/dashboard/registered-families/:disasterId?from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public
 */
exports.getTotalRegisteredFamiliesByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;
    const { from, to } = req.query; // optional date filter

    try {
        // (1) Get active evacuation event IDs
        const { data: events, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id, evacuation_end_date')
            .eq('disaster_id', disasterId);
            // .is('evacuation_end_date', null);

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to fetch active evacuation events.', 500));
        }

        if (!events || events.length === 0) {
            return res.status(200).json({ count: 0 });
        }

        const eventIds = events.map(ev => ev.id);

        // (2) If filter dates are provided → use evacuation_registrations
        if (from && to) {
            const { data: registrations, error: regError } = await supabase
                .from('evacuation_registrations')
                .select('family_head_id') // counting families
                .in('disaster_evacuation_event_id', eventIds)
                .gte('arrival_timestamp', from)
                .lte('arrival_timestamp', to);

            if (regError) {
                console.error('Supabase Error (registrations):', regError);
                return next(new ApiError('Failed to fetch filtered family registrations.', 500));
            }

            // Use Set to get unique families
            const uniqueFamilies = new Set(registrations.map(r => r.family_head_id));

            return res.status(200).json({
                message: 'Filtered families count by arrival date.',
                count: uniqueFamilies.size || 0,
            });
        }

        // (3) Otherwise → live data from evacuation_summaries
        const activeEventIds = events
            .filter(ev => ev.evacuation_end_date === null)
            .map(ev => ev.id);

        if (activeEventIds.length === 0) {
            return res.status(200).json({ count: 0 });
        }

        // Fetch family totals from summaries
        const { data: summaries, error: summaryError } = await supabase
            .from('evacuation_summaries')
            .select('total_no_of_family')
            .in('disaster_evacuation_event_id', activeEventIds);

        if (summaryError) {
            console.error('Supabase Error (evacuation summaries):', summaryError);
            return next(new ApiError('Failed to fetch family totals.', 500));
        }

        // Compute total
        const totalFamilies = summaries.reduce((sum, entry) => {
            return sum + (entry.total_no_of_family || 0);
        }, 0);

        res.status(200).json({
            message: 'Live families count from summaries.',
            count: totalFamilies,
        });

    } catch (err) {
        console.error(err);
        next(new ApiError('Internal server error during family count.', 500));
    }
};

/**
 * @desc Get evacuee statistics by demographic/vulnerability type for a disaster
 *       Live = evacuation_summaries
 *       Filtered = evacuation_registrations + joins
 * @route GET /api/v1/dashboard/evacuee-statistics/:disasterId?from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public
 */
exports.getEvacueeStatisticsByDisaster = async (req, res, next) => {
  const { disasterId } = req.params;
  const { from, to } = req.query; // optional date range

  try {
    // (1) Get all evacuation events for the disaster
    const { data: events, error: eventError } = await supabase
      .from("disaster_evacuation_event")
      .select("id, evacuation_end_date")
      .eq("disaster_id", disasterId);

    if (eventError) {
      console.error("Supabase Error (evacuation events):", eventError);
      return next(new ApiError("Failed to fetch evacuation events.", 500));
    }

    if (!events || events.length === 0) {
      return res.status(200).json({ statistics: {} });
    }

    const eventIds = events.map(ev => ev.id);

    // (2) If filter dates provided → compute from registrations
    if (from && to) {
      // Fetch all evacuees registered in the date range
      const { data: registrations, error: regError } = await supabase
        .from("evacuation_registrations")
        .select(`
          id,
          evacuee_residents (
            id,
            resident_id,
            resident:residents (
              id,
              birthdate,
              sex
            ),
            vulnerabilities:resident_vulnerabilities (
              id,
              vulnerability_type:vulnerability_types (
                name
              )
            )
          )
        `)
        .in("disaster_evacuation_event_id", eventIds)
        .gte("arrival_timestamp", from)
        .lte("arrival_timestamp", to);

      if (regError) {
        console.error("Supabase Error (registrations):", regError);
        return next(new ApiError("Failed to fetch filtered registrations.", 500));
      }

      // Aggregate counts
      const stats = {
        total_no_of_male: 0,
        total_no_of_female: 0,
        total_no_of_infant: 0,
        total_no_of_children: 0,
        total_no_of_youth: 0,
        total_no_of_adult: 0,
        total_no_of_seniors: 0,
        total_no_of_pwd: 0,
        total_no_of_pregnant: 0,
        total_no_of_lactating_women: 0,
      };

      const today = new Date();

      registrations.forEach(reg => {
        const resident = reg.evacuee_residents?.resident;
        const vulnerabilities = reg.evacuee_residents?.vulnerabilities || [];

        if (resident) {
          // Sex counts
          if (resident.sex?.toLowerCase() === "male") stats.total_no_of_male++;
          if (resident.sex?.toLowerCase() === "female") stats.total_no_of_female++;

          // Age group counts
          if (resident.birthdate) {
            const birthDate = new Date(resident.birthdate);
            const age =
              today.getFullYear() -
              birthDate.getFullYear() -
              (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);

            if (age <= 1) stats.total_no_of_infant++;
            else if (age >= 2 && age <= 12) stats.total_no_of_children++;
            else if (age >= 13 && age <= 17) stats.total_no_of_youth++;
            else if (age >= 18 && age <= 59) stats.total_no_of_adult++;
            else if (age >= 60) stats.total_no_of_seniors++;
          }
        }

        // Vulnerabilities
        vulnerabilities.forEach(v => {
          const typeName = v.vulnerability_type?.name?.toLowerCase();
          if (typeName === "person with disability") stats.total_no_of_pwd++;
          if (typeName === "pregnant woman") stats.total_no_of_pregnant++;
          if (typeName === "lactating woman") stats.total_no_of_lactating_women++;
        });
      });

      return res.status(200).json({
        message: "Filtered evacuee statistics by arrival date.",
        statistics: stats,
      });
    }

    // (3) Otherwise → live data from evacuation_summaries
    const activeEventIds = events
      .filter(ev => ev.evacuation_end_date === null)
      .map(ev => ev.id);

    if (activeEventIds.length === 0) {
      return res.status(200).json({ statistics: {} });
    }

    const { data: summaries, error: summaryError } = await supabase
      .from("evacuation_summaries")
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
      .in("disaster_evacuation_event_id", activeEventIds);

    if (summaryError) {
      console.error("Supabase Error (evacuation summaries):", summaryError);
      return next(new ApiError("Failed to fetch evacuee statistics.", 500));
    }

    const aggregatedStats = summaries.reduce((totals, entry) => {
      for (const key in entry) {
        totals[key] = (totals[key] || 0) + (entry[key] || 0);
      }
      return totals;
    }, {});

    res.status(200).json({
      message: "Live evacuee statistics from summaries.",
      statistics: aggregatedStats,
    });

  } catch (err) {
    console.error("Internal error:", err);
    next(new ApiError("Internal server error during evacuee statistics aggregation.", 500));
  }
};

/**
 * @desc Get ranked evacuation center capacity status for a disaster
 *       Live = evacuation_summaries
 *       Filtered = evacuation_registrations (by arrival_timestamp)
 * @route GET /api/v1/dashboard/capacity-status/:disasterId?from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public
 */
exports.getEvacuationCenterCapacityStatus = async (req, res, next) => {
    const { disasterId } = req.params;
    const { from, to } = req.query; // optional date filter

    try {
        // (1) Get all evacuation events for the disaster
        const { data: events, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id, evacuation_center_id, evacuation_end_date')
            .eq('disaster_id', disasterId);

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to retrieve evacuation events.', 500));
        }

        if (!events || events.length === 0) {
            return res.status(200).json({
                message: 'No evacuation centers found for this disaster.',
                data: [],
            });
        }

        let occupancyMap = {};
        let centerIds = [];

        // (2) If filter dates are provided → Historical mode
        if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);

            // Filter out events that ended before the "from" date
            const filteredEvents = events.filter(ev => {
                const endDate = ev.evacuation_end_date
                    ? new Date(ev.evacuation_end_date)
                    : null;

                // Include if:
                // - No end date (still active)
                // - OR end date >= fromDate (was still active in date range)
                return !endDate || endDate >= fromDate;
            });

            if (filteredEvents.length === 0) {
                return res.status(200).json({
                    message: 'No evacuation centers found for this date range.',
                    data: [],
                });
            }

            const filteredEventIds = filteredEvents.map(ev => ev.id);
            centerIds = [...new Set(filteredEvents.map(ev => ev.evacuation_center_id))];

            const { data: registrations, error: regError } = await supabase
                .from('evacuation_registrations')
                .select('disaster_evacuation_event_id')
                .in('disaster_evacuation_event_id', filteredEventIds)
                .gte('arrival_timestamp', from)
                .lte('arrival_timestamp', to);

            if (regError) {
                console.error('Supabase Error (registrations):', regError);
                return next(new ApiError('Failed to fetch filtered registrations.', 500));
            }

            // Count evacuees per center
            for (const reg of registrations) {
                const event = filteredEvents.find(e => e.id === reg.disaster_evacuation_event_id);
                if (!event) continue;
                const centerId = event.evacuation_center_id;
                occupancyMap[centerId] = (occupancyMap[centerId] || 0) + 1;
            }
        }
        // (3) Otherwise → Live mode (only active events)
        else {
            const activeEvents = events.filter(ev => ev.evacuation_end_date === null);
            const activeEventIds = activeEvents.map(ev => ev.id);

            if (activeEventIds.length === 0) {
                return res.status(200).json({
                    message: 'No active evacuation centers found for this disaster.',
                    data: [],
                });
            }

            centerIds = [...new Set(activeEvents.map(ev => ev.evacuation_center_id))];

            const { data: summaries, error: summaryError } = await supabase
                .from('evacuation_summaries')
                .select('disaster_evacuation_event_id, total_no_of_individuals')
                .in('disaster_evacuation_event_id', activeEventIds);

            if (summaryError) {
                console.error('Supabase Error (evacuation_summaries):', summaryError);
                return next(new ApiError('Failed to retrieve summaries.', 500));
            }

            for (const summary of summaries) {
                const event = activeEvents.find(e => e.id === summary.disaster_evacuation_event_id);
                if (!event) continue;
                const centerId = event.evacuation_center_id;
                occupancyMap[centerId] = (occupancyMap[centerId] || 0) + (summary.total_no_of_individuals || 0);
            }
        }

        // (4) Get evacuation center details
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

        // (5) Build ranked list
        const rankedCenters = centers.map(center => ({
            id: center.id,
            name: center.name,
            barangay_name: center.barangay?.name || 'Unknown',
            total_capacity: center.total_capacity || 0,
            current_occupancy: occupancyMap[center.id] || 0
        })).sort((a, b) => b.current_occupancy - a.current_occupancy);

        res.status(200).json({
            message: from && to
                ? 'Filtered evacuation center capacity status by arrival date.'
                : 'Live evacuation center capacity status.',
            data: rankedCenters,
        });

    } catch (err) {
        console.error('Error:', err);
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





