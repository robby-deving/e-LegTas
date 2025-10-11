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

// GET /api/v1/dashboard/barangay/disasters/:barangayId
exports.getBarangayActiveDisasters = async (req, res) => {
  try {
    const { barangayId } = req.params;
    if (!barangayId) {
      return res.status(400).json({ message: 'barangayId is required' });
    }

    // Fetch disasters linked to evacuation centers in this barangay
    const { data: events, error: eventsError } = await supabase
      .from('disaster_evacuation_event')
      .select(`
        id,
        disaster_id,
        evacuation_center_id,
        disasters (
          id,
          disaster_name,
          disaster_start_date,
          disaster_end_date,
          disaster_types (
            name
          )
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

    // Filter and map to include only active (no end_date) disasters
    const result = (events || [])
      .filter(ev => ev.disasters && ev.disasters.disaster_end_date === null)
      .map(ev => ({
        id: ev.disasters.id,
        disaster_name: ev.disasters.disaster_name,
        disaster_start_date: ev.disasters.disaster_start_date,
        disaster_end_date: ev.disasters.disaster_end_date,
        disaster_types: {
          name: ev.disasters.disaster_types?.name || "Unknown"
        },
        evacuation_center_id: ev.evacuation_center_id,
        disaster_evacuation_event_id: ev.id
      }));

    // Remove duplicates by disaster ID
    const uniqueMap = new Map();
    for (const d of result) {
      if (!uniqueMap.has(d.id)) uniqueMap.set(d.id, d);
    }

    return res.status(200).json({ data: Array.from(uniqueMap.values()) });
  } catch (err) {
    console.error('Server error getBarangayActiveDisasters:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc Get Barangay Dashboard Summary (live + optional date filter)
 * @route GET /api/v1/dashboard/barangay/:barangayId?disasterId=...&from=YYYY-MM-DDTHH:mm:ssZ&to=YYYY-MM-DDTHH:mm:ssZ
 * @access Public (testing only)
 */
exports.getBarangayDashboard = async (req, res) => {
  try {
    const { barangayId } = req.params;
    const { disasterId, from, to } = req.query;

    if (!barangayId) return res.status(400).json({ message: "barangayId is required" });

    // 1️⃣ Barangay info
    const { data: barangay, error: barangayError } = await supabase
      .from("barangays")
      .select("id,name")
      .eq("id", barangayId)
      .maybeSingle();
    if (barangayError)
      return res.status(500).json({ message: "DB error (barangay)", error: barangayError.message });
    if (!barangay) return res.status(404).json({ message: "Barangay not found" });

    // 2️⃣ Evacuation centers under barangay
    const { data: centers, error: centersError } = await supabase
      .from("evacuation_centers")
      .select("id")
      .eq("barangay_id", barangayId)
      .is("deleted_at", null);

    if (centersError)
      return res.status(500).json({ message: "DB error (centers)", error: centersError.message });

    const centerIds = (centers || []).map(c => c.id);
    const centersCount = centerIds.length;

    if (centerIds.length === 0) {
      return res.status(200).json({
        barangay,
        totals: { total_registered_families: 0, total_registered_evacuees: 0 },
        evacuee_stats: {
          male: 0, female: 0, infant: 0, children: 0, youth: 0,
          adult: 0, senior_citizens: 0, pwd: 0, pregnant: 0, lactating: 0
        },
        families_with_relief: 0,
        meta: { centers_count: centersCount, events_count: 0 }
      });
    }

    // 3️⃣ Get active evacuation events
    let eventsQuery = supabase
      .from("disaster_evacuation_event")
      .select("id, disaster_id, evacuation_center_id")
      .in("evacuation_center_id", centerIds)
      .is("evacuation_end_date", null);

    if (disasterId) eventsQuery = eventsQuery.eq("disaster_id", disasterId);

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError)
      return res.status(500).json({ message: "DB error (events)", error: eventsError.message });

    const eventIds = (events || []).map(e => e.id);
    const eventsCount = eventIds.length;

    if (eventIds.length === 0) {
      return res.status(200).json({
        barangay,
        totals: { total_registered_families: 0, total_registered_evacuees: 0 },
        evacuee_stats: {
          male: 0, female: 0, infant: 0, children: 0, youth: 0,
          adult: 0, senior_citizens: 0, pwd: 0, pregnant: 0, lactating: 0
        },
        families_with_relief: 0,
        meta: { centers_count: centersCount, events_count: eventsCount }
      });
    }

    // Shared helper to count families with relief goods
    const getFamiliesWithReliefGoods = async (eventIds, from = null, to = null) => {
      try {
        let query = supabase.from("services").select("family_id, disaster_evacuation_event_id").in("disaster_evacuation_event_id", eventIds);
        if (from && to) query = query.gte("created_at", from).lte("created_at", to);

        const { data: services, error: servicesError } = await query;
        if (servicesError) {
          console.error("Supabase Error (services):", servicesError);
          return 0;
        }

        const familyIds = [...new Set((services || []).map(s => s.family_id))];
        if (familyIds.length === 0) return 0;

        const { data: regs, error: regsError } = await supabase
          .from("evacuation_registrations")
          .select("family_head_id")
          .in("family_head_id", familyIds)
          .in("disaster_evacuation_event_id", eventIds)
          .is("decampment_timestamp", null);

        if (regsError) {
          console.error("Supabase Error (active families):", regsError);
          return 0;
        }

        return new Set((regs || []).map(r => r.family_head_id)).size;
      } catch (err) {
        console.error("Error counting families with relief goods:", err);
        return 0;
      }
    };

    // -------------------------------
    // FILTERED MODE (with ?from & ?to)
    // -------------------------------
    if (from && to) {
      const { data: registrations, error: regError } = await supabase
        .from("evacuation_registrations")
        .select(`family_head_id, arrival_timestamp, vulnerability_type_ids, profile_snapshot, disaster_evacuation_event_id`)
        .in("disaster_evacuation_event_id", eventIds)
        .gte("arrival_timestamp", from)
        .lte("arrival_timestamp", to);

      if (regError)
        return res.status(500).json({ message: "DB error (filtered registrations)", error: regError.message });

      const registeredEvacuees = registrations?.length || 0;
      const uniqueFamilies = new Set(registrations.map(r => r.family_head_id));
      const registeredFamilies = uniqueFamilies.size;

      // Stats accumulator
      const stats = {
        male: 0, female: 0, infant: 0, children: 0,
        youth: 0, adult: 0, senior_citizens: 0,
        pwd: 0, pregnant: 0, lactating: 0
      };

      const today = new Date();

      registrations.forEach(reg => {
        let snapshot = reg.profile_snapshot;
        if (typeof snapshot === "string") {
          try {
            snapshot = JSON.parse(snapshot);
          } catch {
            snapshot = null;
          }
        }

        const sex = snapshot?.sex?.toLowerCase();
        if (sex === "male") stats.male++;
        if (sex === "female") stats.female++;

        const birthdateStr = snapshot?.birthdate;
        if (birthdateStr) {
          const birthDate = new Date(birthdateStr);
          if (!isNaN(birthDate)) {
            const age =
              today.getFullYear() -
              birthDate.getFullYear() -
              (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);

            if (age <= 1) stats.infant++;
            else if (age <= 12) stats.children++;
            else if (age <= 17) stats.youth++;
            else if (age <= 59) stats.adult++;
            else stats.senior_citizens++;
          }
        }

        const vulnIds = reg.vulnerability_type_ids || [];
        if (Array.isArray(vulnIds)) {
          vulnIds.forEach(id => {
            if (id === "4" || id === 4) stats.pwd++;
            if (id === "5" || id === 5) stats.pregnant++;
            if (id === "6" || id === 6) stats.lactating++;
          });
        }
      });

      const familiesWithRelief = await getFamiliesWithReliefGoods(eventIds, from, to);

      return res.status(200).json({
        barangay,
        totals: {
          total_registered_families: registeredFamilies,
          total_registered_evacuees: registeredEvacuees
        },
        evacuee_stats: stats,
        families_with_relief: familiesWithRelief,
        meta: {
          centers_count: centersCount,
          events_count: eventsCount,
          events_ids: eventIds
        },
        message: "Filtered barangay dashboard summary by arrival date."
      });
    }

    // -------------------------------
    // LIVE MODE (no date filter)
    // -------------------------------
    const { data: summaries, error: summariesError } = await supabase
      .from("evacuation_summaries")
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
      .in("disaster_evacuation_event_id", eventIds);

    if (summariesError)
      return res.status(500).json({ message: "DB error (summaries)", error: summariesError.message });

    const totals = {
      total_registered_families: 0,
      total_registered_evacuees: 0,
      male: 0, female: 0, infant: 0, children: 0, youth: 0,
      adult: 0, senior_citizens: 0, pwd: 0, pregnant: 0, lactating: 0
    };

    summaries.forEach(s => {
      totals.total_registered_families += Number(s.total_no_of_family || 0);
      totals.total_registered_evacuees += Number(s.total_no_of_individuals || 0);
      totals.male += Number(s.total_no_of_male || 0);
      totals.female += Number(s.total_no_of_female || 0);
      totals.infant += Number(s.total_no_of_infant || 0);
      totals.children += Number(s.total_no_of_children || 0);
      totals.youth += Number(s.total_no_of_youth || 0);
      totals.adult += Number(s.total_no_of_adult || 0);
      totals.senior_citizens += Number(s.total_no_of_seniors || 0);
      totals.pwd += Number(s.total_no_of_pwd || 0);
      totals.pregnant += Number(s.total_no_of_pregnant || 0);
      totals.lactating += Number(s.total_no_of_lactating_women || 0);
    });

    const familiesWithRelief = await getFamiliesWithReliefGoods(eventIds);

    return res.status(200).json({
      barangay,
      totals: {
        total_registered_families: totals.total_registered_families,
        total_registered_evacuees: totals.total_registered_evacuees
      },
      evacuee_stats: {
        male: totals.male,
        female: totals.female,
        infant: totals.infant,
        children: totals.children,
        youth: totals.youth,
        adult: totals.adult,
        senior_citizens: totals.senior_citizens,
        pwd: totals.pwd,
        pregnant: totals.pregnant,
        lactating: totals.lactating
      },
      families_with_relief: familiesWithRelief,
      meta: {
        centers_count: centersCount,
        events_count: eventsCount,
        events_ids: eventIds
      },
      message: "Live barangay dashboard summary."
    });
  } catch (err) {
    console.error("Server error getBarangayDashboard:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};