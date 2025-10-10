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

// --- For CDRRMO/CSWDO ---

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
 * @desc Count total families that received relief goods for a specific disaster
 *       Live = services (filtered by active evacuation events)
 *       Filtered = services (filtered by created_at range)
 * @route GET /api/v1/dashboard/families-with-relief-goods/:disasterId?from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public
 */
exports.getFamiliesWithReliefGoodsByDisaster = async (req, res, next) => {
    const { disasterId } = req.params;
    const { from, to } = req.query; // optional date filter

    try {
        // (1) Get evacuation events for the disaster
        const { data: events, error: eventError } = await supabase
            .from('disaster_evacuation_event')
            .select('id, evacuation_end_date')
            .eq('disaster_id', disasterId);

        if (eventError) {
            console.error('Supabase Error (evacuation events):', eventError);
            return next(new ApiError('Failed to fetch evacuation events.', 500));
        }

        if (!events || events.length === 0) {
            return res.status(200).json({ count: 0 });
        }

        const eventIds = events.map(ev => ev.id);

        // (2) If filter dates are provided → query services table with created_at range
        if (from && to) {
            const { data: servicesData, error: serviceError } = await supabase
                .from('services')
                .select('family_id')
                .in('disaster_evacuation_event_id', eventIds)
                .gte('created_at', from)
                .lte('created_at', to);

            if (serviceError) {
                console.error('Supabase Error (services):', serviceError);
                return next(new ApiError('Failed to fetch filtered relief goods data.', 500));
            }

            // Unique families count
            const uniqueFamilies = new Set(servicesData.map(s => s.family_id));

            return res.status(200).json({
                message: 'Filtered families that received relief goods by created_at.',
                count: uniqueFamilies.size || 0,
            });
        }

        // (3) Otherwise → only count services linked to *active* events
        const activeEventIds = events
          .filter(ev => ev.evacuation_end_date === null)
          .map(ev => ev.id);

        if (activeEventIds.length === 0) {
          return res.status(200).json({ count: 0 });
        }

        // (3a) Get families that still have at least one member inside (not decamped)
        const { data: activeFamilies, error: activeFamiliesError } = await supabase
          .from('evacuation_registrations')
          .select('family_head_id')
          .in('disaster_evacuation_event_id', activeEventIds)
          .is('decampment_timestamp', null); // still active evacuees

        if (activeFamiliesError) {
          console.error('Supabase Error (active families):', activeFamiliesError);
          return next(new ApiError('Failed to fetch active families.', 500));
        }

        if (!activeFamilies || activeFamilies.length === 0) {
          return res.status(200).json({ count: 0 });
        }

        const activeFamilyIds = [...new Set(activeFamilies.map(f => f.family_head_id))];

        // (3b) Get families with services, but only for those still active
        const { data: liveServices, error: liveError } = await supabase
          .from('services')
          .select('family_id')
          .in('disaster_evacuation_event_id', activeEventIds)
          .in('family_id', activeFamilyIds);

        if (liveError) {
          console.error('Supabase Error (services live):', liveError);
          return next(new ApiError('Failed to fetch live relief goods data.', 500));
        }

        const uniqueFamiliesLive = new Set(liveServices.map(s => s.family_id));

        res.status(200).json({
          message: 'Live families that received relief goods (excluding fully decamped families).',
          count: uniqueFamiliesLive.size || 0,
        });

    } catch (err) {
        console.error(err);
        next(new ApiError('Internal server error during relief goods family count.', 500));
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
          profile_snapshot,
          vulnerability_type_ids,
          arrival_timestamp,
          disaster_evacuation_event_id
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
        const vulnIds = reg?.vulnerability_type_ids || [];

        let snapshot = reg?.profile_snapshot ?? null;
        if (snapshot && typeof snapshot === "string") {
          try {
            snapshot = JSON.parse(snapshot);
          } catch (e) {
            // If parsing fails, drop snapshot (don't crash)
            snapshot = null;
          }
        }

        // Sex Counts
        const sex = snapshot?.sex ? String(snapshot.sex).toLowerCase() : null;
        if (sex === "male") stats.total_no_of_male++;
        if (sex === "female") stats.total_no_of_female++;

        // Age Groups
        const birthdateStr = snapshot?.birthdate || null;
        if (birthdateStr) {
          const birthDate = new Date(birthdateStr);
          if (!isNaN(birthDate.getTime())) {
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
        if (Array.isArray(vulnIds)) {
          vulnIds.forEach(id => {
            // treat id as string or number
            if (id === "4" || id === 4) stats.total_no_of_pwd++; // Person with Disability
            if (id === "5" || id === 5) stats.total_no_of_pregnant++; // Pregnant Woman
            if (id === "6" || id === 6) stats.total_no_of_lactating_women++; // Lactating Woman
          });
        }
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

// --- For Camp Managers ---

/**
 * @desc Get active disasters assigned to a camp manager
 * @route GET /api/v1/dashboard/camp-manager/disasters/:userId
 * @access Public (testing only, no login)
 */
exports.getCampManagerDisasters = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("disaster_evacuation_event")
      .select(`
        id,
        disaster_id,
        evacuation_center_id,
        disasters (
          id,
          disaster_name,
          disaster_start_date,
          disaster_end_date,
          disaster_types ( name )
        )
      `)
      .eq("assigned_user_id", userId)
      .is("evacuation_end_date", null);

    if (error) return res.status(500).json({ error: error.message });

    // flatten so that only the disaster details are returned
    const disasters = data
      .filter(d => d.disasters) // join result
      .map(d => ({
        ...d.disasters,
        // include the evacuation_center_id if needed in the future
        evacuation_center_id: d.evacuation_center_id,
        disaster_evacuation_event_id: d.id,
      }));

    res.status(200).json(disasters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @desc Get Evacuation Center Name and Barangay for a given disaster_evacuation_event_id
 * @route GET /api/v1/dashboard/camp-manager/center/:eventId
 * @access Public (testing only, no login)
 */
exports.getCampManagerCenterInfo = async (req, res) => {
  try {
    const { eventId } = req.params;

    const { data, error } = await supabase
      .from("disaster_evacuation_event")
      .select(`
        id,
        evacuation_centers (
          id,
          name,
          barangays ( name )
        )
      `)
      .eq("id", eventId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (!data) return res.status(404).json({ error: "Event not found" });

    const centerInfo = {
      id: data.evacuation_centers.id,
      name: data.evacuation_centers.name,
      barangay: data.evacuation_centers.barangays?.name || null,
    };

    res.status(200).json(centerInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @desc Get Camp Manager Dashboard Summary by Disaster Evacuation Event
 *       Live = evacuation_summaries
 *       Filtered = evacuation_registrations (by arrival_timestamp)
 * @route GET /api/v1/dashboard/camp-manager/summary/:eventId?from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public (testing only, should be protected in production)
 */
exports.getCampManagerDashboardSummary = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { from, to } = req.query; // optional date filter (ISO UTC strings)

    // Shared function to count families with relief goods
    const getFamiliesWithReliefGoods = async (eventId, from = null, to = null) => {
      try {
        // 1️⃣ Fetch all families that have any service entry during this event
        let query = supabase
          .from("services")
          .select("family_id")
          .eq("disaster_evacuation_event_id", eventId);

        // Apply date filter if provided
        if (from && to) {
          query = query.gte("created_at", from).lte("created_at", to);
        }

        const { data: services, error: servicesError } = await query;
        if (servicesError) {
          console.error("Supabase Error (services fetch):", servicesError);
          return 0;
        }

        // 2️⃣ Extract unique family IDs from services
        const familyIds = [...new Set((services || []).map(s => s.family_id))];
        if (familyIds.length === 0) return 0;

        // 3️⃣ Fetch active families (those with at least one member not decamped)
        const { data: activeFamilies, error: activeError } = await supabase
          .from("evacuation_registrations")
          .select("family_head_id")
          .in("family_head_id", familyIds)
          .eq("disaster_evacuation_event_id", eventId)
          .is("decampment_timestamp", null);

        if (activeError) {
          console.error("Supabase Error (active families check):", activeError);
          return 0;
        }

        // 4️⃣ Count unique active family IDs
        const uniqueActiveFamilies = new Set(activeFamilies.map(f => f.family_head_id));
        return uniqueActiveFamilies.size;
      } catch (error) {
        console.error("Error counting families with relief goods:", error);
        return 0;
      }
    };

    // --------------------
    // Filtered mode (with date range)
    // --------------------
    if (from && to) {
      // Fetch registrations in the date range for this event with resident details
      const { data: registrations, error: regError } = await supabase
        .from("evacuation_registrations")
        .select(`
          id,
          family_head_id,
          arrival_timestamp,
          vulnerability_type_ids,
          profile_snapshot
        `)
        .eq("disaster_evacuation_event_id", eventId)
        .gte("arrival_timestamp", from)
        .lte("arrival_timestamp", to);

      if (regError) {
        console.error("Supabase Error (filtered registrations):", regError);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch filtered registrations.",
        });
      }

      // Registered evacuees = number of registrations
      const registeredEvacuees = registrations?.length || 0;

      // Registered families = unique family_head_id count
      const uniqueFamilies = new Set((registrations || []).map(r => r.family_head_id));
      const registeredFamilies = uniqueFamilies.size;

      // Initialize evacuee statistics
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

      // Use "today" semantics for age calculation
      const today = new Date();

      (registrations || []).forEach(reg => {
        const vulnIds = reg.vulnerability_type_ids || [];

        let snapshot = reg?.profile_snapshot ?? null; // could be object or string
        if (snapshot && typeof snapshot === "string") {
          try {
            snapshot = JSON.parse(snapshot);
          } catch {
            snapshot = null;
          }
        }

        // Count Sex
        const sex = snapshot?.sex ? String(snapshot.sex).toLowerCase() : null;
        if (sex === "male") stats.total_no_of_male++;
        if (sex === "female") stats.total_no_of_female++;

        // Age Groups
        const birthdateStr = snapshot?.birthdate || null;
        if (birthdateStr) {
          const birthDate = new Date(birthdateStr);
          if (!isNaN(birthDate.getTime())) {
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

        // Vulnerabilities (only for PWD, Pregnant Woman, Lactating Woman)
        if (Array.isArray(vulnIds)) {
          vulnIds.forEach(id => {
            if (id === "4" || id === 4) stats.total_no_of_pwd++; // Person with Disability
            if (id === "5" || id === 5) stats.total_no_of_pregnant++; // Pregnant Woman
            if (id === "6" || id === 6) stats.total_no_of_lactating_women++; // Lactating Woman
          });
        }
      });

      // Fetch evacuation center capacity (same as live mode)
      const { data: center, error: centerError } = await supabase
        .from("disaster_evacuation_event")
        .select(
          `
          evacuation_center:evacuation_centers (
            id,
            name,
            total_capacity
          )
        `
        )
        .eq("id", eventId)
        .single();

      if (centerError) {
        console.error("Supabase Error (center fetch):", centerError);
      }

      const totalFamiliesWithReliefGoods = await getFamiliesWithReliefGoods(eventId, from, to);

      return res.status(200).json({
        success: true,
        data: {
          registeredFamilies,
          registeredEvacuees,
          ecCapacity: center?.evacuation_center?.total_capacity || 0,
          totalFamiliesWithReliefGoods,
          evacueeStatistics: stats,
        },
        message: "Filtered camp manager summary by arrival date.",
      });
    }

    // --------------------
    // Live mode (no date filter)
    // --------------------
    const { data: summary, error: summaryError } = await supabase
      .from("evacuation_summaries")
      .select(
        `
        total_no_of_family,
        total_no_of_individuals,
        total_no_of_male,
        total_no_of_female,
        total_no_of_infant,
        total_no_of_children,
        total_no_of_youth,
        total_no_of_adult,
        total_no_of_seniors,
        total_no_of_pwd,
        total_no_of_pregnant,
        total_no_of_lactating_women,
        disaster_evacuation_event_id
      `
      )
      .eq("disaster_evacuation_event_id", eventId)
      .single();

    if (summaryError) throw summaryError;

    const { data: center, error: centerError } = await supabase
      .from("disaster_evacuation_event")
      .select(
        `
        evacuation_center:evacuation_centers (
          id,
          name,
          total_capacity
        )
      `
      )
      .eq("id", eventId)
      .single();

    if (centerError) throw centerError;

    const totalFamiliesWithReliefGoods = await getFamiliesWithReliefGoods(eventId);

    return res.status(200).json({
      success: true,
      data: {
        registeredFamilies: summary?.total_no_of_family || 0,
        registeredEvacuees: summary?.total_no_of_individuals || 0,
        ecCapacity: center?.evacuation_center?.total_capacity || 0,
        totalFamiliesWithReliefGoods,
        evacueeStatistics: {
          total_no_of_male: summary?.total_no_of_male || 0,
          total_no_of_female: summary?.total_no_of_female || 0,
          total_no_of_infant: summary?.total_no_of_infant || 0,
          total_no_of_children: summary?.total_no_of_children || 0,
          total_no_of_youth: summary?.total_no_of_youth || 0,
          total_no_of_adult: summary?.total_no_of_adult || 0,
          total_no_of_seniors: summary?.total_no_of_seniors || 0,
          total_no_of_pwd: summary?.total_no_of_pwd || 0,
          total_no_of_pregnant: summary?.total_no_of_pregnant || 0,
          total_no_of_lactating_women: summary?.total_no_of_lactating_women || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching Camp Manager Dashboard summary:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
};


// --- For Barangay Officials ---

/**
 * @desc Get active disasters accessible to a barangay officer
 * @route GET /api/v1/dashboard/barangay/disasters/:userId
 * @access Public (for testing; restrict later with auth middleware)
 */

// exports.getBarangayOfficerDisasters = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // 1️⃣ Find the barangay assigned to this barangay officer
//     const { data: barangayData, error: barangayError } = await supabase
//       .from("barangay_officials")
//       .select("barangay_id")
//       .eq("user_profile_id", userId)
//       .single();

//     if (barangayError || !barangayData)
//       return res.status(404).json({ error: "Barangay officer not found or not assigned to any barangay." });

//     const barangayId = barangayData.barangay_id;

//     // 2️⃣ Get all evacuation centers within this barangay
//     const { data: evacuationCenters, error: ecError } = await supabase
//       .from("evacuation_centers")
//       .select("id")
//       .eq("barangay_id", barangayId);

//     if (ecError) return res.status(500).json({ error: ecError.message });
//     if (!evacuationCenters || evacuationCenters.length === 0)
//       return res.status(404).json({ error: "No evacuation centers found in this barangay." });

//     const evacuationCenterIds = evacuationCenters.map(ec => ec.id);

//     // 3️⃣ Get all active disaster evacuation events related to these centers
//     const { data, error } = await supabase
//       .from("disaster_evacuation_event")
//       .select(`
//         id,
//         disaster_id,
//         evacuation_center_id,
//         disasters (
//           id,
//           disaster_name,
//           disaster_start_date,
//           disaster_end_date,
//           disaster_types ( name )
//         )
//       `)
//       .in("evacuation_center_id", evacuationCenterIds)
//       .is("evacuation_end_date", null); // only ongoing evacuations

//     if (error) return res.status(500).json({ error: error.message });

//     // 4️⃣ Filter and flatten data (only active disasters)
//     const disasters = data
//       .filter(d => d.disasters && d.disasters.disaster_end_date === null)
//       .map(d => ({
//         ...d.disasters,
//         evacuation_center_id: d.evacuation_center_id,
//         disaster_evacuation_event_id: d.id,
//       }));

//     // 5️⃣ Send result
//     res.status(200).json(disasters);
//   } catch (err) {
//     console.error("Error fetching barangay officer disasters:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

// GET /api/v1/dashboard/barangay/disasters/:barangayOfficialId
exports.getBarangayActiveDisasters = async (req, res) => {
  try {
    const { barangayOfficialId } = req.params;
    if (!barangayOfficialId) {
      return res.status(400).json({ message: 'barangayOfficialId is required' });
    }

    // 1) find barangay_id from barangay_officials
    const { data: bo, error: boError } = await supabase
      .from('barangay_officials')
      .select('barangay_id')
      .eq('id', barangayOfficialId)
      .maybeSingle();

    if (boError) {
      console.error('Error fetching barangay_officials:', boError);
      return res.status(500).json({ message: 'Database error', error: boError.message });
    }
    if (!bo) {
      return res.status(404).json({ message: 'Barangay official not found' });
    }
    const barangayId = bo.barangay_id;

    // 2) fetch disaster_evacuation_event rows linked to evacuation_centers in this barangay
    const { data: events, error: eventsError } = await supabase
      .from('disaster_evacuation_event')
      .select(`
        disaster_id,
        disasters (
          id,
          disaster_name,
          disaster_start_date,
          disaster_end_date,
          disaster_type_id
        ),
        evacuation_centers (
          id,
          barangay_id
        )
      `)
      .eq('evacuation_centers.barangay_id', barangayId);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return res.status(500).json({ message: 'Database error', error: eventsError.message });
    }

    // 3) map to unique active disasters (disaster_end_date IS NULL)
    const map = new Map();
    (events || []).forEach((ev) => {
      const d = ev.disasters;
      if (!d) return;
      if (d.disaster_end_date !== null) return; // skip ended disasters
      if (!map.has(d.id)) {
        map.set(d.id, {
          id: d.id,
          disaster_name: d.disaster_name,
          disaster_start_date: d.disaster_start_date,
          disaster_type_id: d.disaster_type_id
        });
      }
    });

    const result = Array.from(map.values());

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('Server error getBarangayActiveDisasters:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


/**
 * GET /api/v1/dashboard/barangay/:barangayId?disasterId=...
 * Returns:
 *  - barangay { id, name }
 *  - totals: total_registered_families, total_registered_evacuees
 *  - evacuee_stats: male, female, infant, children, youth, adult, seniors, pwd, pregnant, lactating
 *  - families_with_relief: integer (unique family_heads who received services AND are currently evacuated in barangay)
 *  - meta: centers_count, events_count
 */
exports.getBarangayDashboard = async (req, res) => {
  try {
    const { barangayId } = req.params;
    const { disasterId } = req.query; // optional

    if (!barangayId) return res.status(400).json({ message: 'barangayId is required' });

    // 1) Barangay info
    const { data: barangay, error: barangayError } = await supabase
      .from('barangays')
      .select('id,name')
      .eq('id', barangayId)
      .maybeSingle();
    if (barangayError) return res.status(500).json({ message: 'DB error (barangay)', error: barangayError.message });
    if (!barangay) return res.status(404).json({ message: 'Barangay not found' });

    // 2) Evacuation centers in barangay (exclude deleted centers if your system uses deleted_at)
    const { data: centers, error: centersError } = await supabase
      .from('evacuation_centers')
      .select('id')
      .eq('barangay_id', barangayId)
      .is('deleted_at', null); // adjust if you want to include soft-deleted centers
    if (centersError) return res.status(500).json({ message: 'DB error (centers)', error: centersError.message });

    const centerIds = (centers || []).map(c => c.id);
    const centersCount = centerIds.length;
    if (centerIds.length === 0) {
      // nothing to aggregate — return zeros
      return res.status(200).json({
        barangay,
        totals: {
          total_registered_families: 0,
          total_registered_evacuees: 0
        },
        evacuee_stats: {
          male: 0, female: 0, infant: 0, children: 0, youth: 0, adult: 0, seniors: 0, pwd: 0, pregnant: 0, lactating: 0
        },
        families_with_relief: 0,
        meta: { centers_count: centersCount, events_count: 0 }
      });
    }

    // 3) disaster_evacuation_event rows for those centers — only currently active events (evacuation_end_date IS NULL)
    let eventsQuery = supabase
      .from('disaster_evacuation_event')
      .select('id, disaster_id, evacuation_center_id')
      .in('evacuation_center_id', centerIds)
      .is('evacuation_end_date', null);

    if (disasterId) eventsQuery = eventsQuery.eq('disaster_id', disasterId);

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) return res.status(500).json({ message: 'DB error (events)', error: eventsError.message });

    const eventIds = (events || []).map(e => e.id);
    const eventsCount = eventIds.length;

    if (eventIds.length === 0) {
      // no active events in barangay (for that disaster if provided)
      return res.status(200).json({
        barangay,
        totals: { total_registered_families: 0, total_registered_evacuees: 0 },
        evacuee_stats: { male: 0, female: 0, infant: 0, children: 0, youth: 0, adult: 0, seniors: 0, pwd: 0, pregnant: 0, lactating: 0 },
        families_with_relief: 0,
        meta: { centers_count: centersCount, events_count: eventsCount }
      });
    }

    // 4) evacuation_summaries — aggregate by summing relevant columns across all eventIds
    const { data: summaries, error: summariesError } = await supabase
      .from('evacuation_summaries')
      .select(`
        disaster_evacuation_event_id,
        total_no_of_family,
        total_no_of_male,
        total_no_of_female,
        total_no_of_individuals,
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

    if (summariesError) return res.status(500).json({ message: 'DB error (summaries)', error: summariesError.message });

    // sum up safely (coerce to numbers)
    const totalsAccumulator = {
      total_registered_families: 0,
      total_registered_evacuees: 0,
      male: 0,
      female: 0,
      infant: 0,
      children: 0,
      youth: 0,
      adult: 0,
      seniors: 0,
      pwd: 0,
      pregnant: 0,
      lactating: 0
    };

    (summaries || []).forEach(s => {
      totalsAccumulator.total_registered_families += Number(s.total_no_of_family || 0);
      // prefer total_no_of_individuals for total evacuees if present
      totalsAccumulator.total_registered_evacuees += Number(s.total_no_of_individuals || 0);
      totalsAccumulator.male += Number(s.total_no_of_male || 0);
      totalsAccumulator.female += Number(s.total_no_of_female || 0);
      totalsAccumulator.infant += Number(s.total_no_of_infant || 0);
      totalsAccumulator.children += Number(s.total_no_of_children || 0);
      totalsAccumulator.youth += Number(s.total_no_of_youth || 0);
      totalsAccumulator.adult += Number(s.total_no_of_adult || 0);
      totalsAccumulator.seniors += Number(s.total_no_of_seniors || 0);
      totalsAccumulator.pwd += Number(s.total_no_of_pwd || 0);
      totalsAccumulator.pregnant += Number(s.total_no_of_pregnant || 0);
      totalsAccumulator.lactating += Number(s.total_no_of_lactating_women || 0);
    });

    // 5) Families with relief goods:
    //  - find unique family_ids in services for those eventIds
    //  - but only count those family_ids that have a current evacuation registration (decampment_timestamp IS NULL)
    const { data: servicesRows, error: servicesError } = await supabase
      .from('services')
      .select('family_id, disaster_evacuation_event_id')
      .in('disaster_evacuation_event_id', eventIds);

    if (servicesError) return res.status(500).json({ message: 'DB error (services)', error: servicesError.message });

    const uniqueFamilyIds = Array.from(new Set((servicesRows || []).map(r => r.family_id).filter(Boolean)));

    let familiesWithReliefCount = 0;

    if (uniqueFamilyIds.length > 0) {
      // find registrations of those family_head_ids that are still evacuated (decampment_timestamp IS NULL)
      const { data: regRows, error: regsError } = await supabase
        .from('evacuation_registrations')
        .select('family_head_id')
        .in('family_head_id', uniqueFamilyIds)
        .in('disaster_evacuation_event_id', eventIds)
        .is('decampment_timestamp', null);

      if (regsError) return res.status(500).json({ message: 'DB error (registrations)', error: regsError.message });

      const familiesCurrentlyEvacuatedSet = new Set((regRows || []).map(r => r.family_head_id).filter(Boolean));
      familiesWithReliefCount = familiesCurrentlyEvacuatedSet.size;
    }

    // 6) send response
    return res.status(200).json({
      barangay,
      totals: {
        total_registered_families: totalsAccumulator.total_registered_families,
        total_registered_evacuees: totalsAccumulator.total_registered_evacuees
      },
      evacuee_stats: {
        male: totalsAccumulator.male,
        female: totalsAccumulator.female,
        infant: totalsAccumulator.infant,
        children: totalsAccumulator.children,
        youth: totalsAccumulator.youth,
        adult: totalsAccumulator.adult,
        senior_citizens: totalsAccumulator.seniors,
        pwd: totalsAccumulator.pwd,
        pregnant: totalsAccumulator.pregnant,
        lactating: totalsAccumulator.lactating
      },
      families_with_relief: familiesWithReliefCount,
      meta: {
        centers_count: centersCount,
        events_count: eventsCount,
        events_ids: eventIds // helpful for debugging on client side
      }
    });

  } catch (err) {
    console.error('Server error getBarangayDashboard:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};