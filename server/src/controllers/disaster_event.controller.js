// disaster_event.controller.js

const supabase = require('../config/supabase'); // Import the centralized Supabase client
// const { logAudit } = require('../utils/auditLogger'); // REMOVED: Import logAudit for auditing

const TABLE_NAME = 'disaster_evacuation_event'; // Main table for this controller
const TABLE_NAME_SUMMARY = 'evacuation_summaries'; // New table for summaries

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
 * @desc Get detailed disaster evacuation event data filtered by disaster evacuation event ID.
 *       Includes summary counts, evacuation center details, and a list of evacuees.
 * @route GET /api/v1/disaster-events/by-disaster-evacuation-event/:disasterEvacuationEventId/details
 * @access Public (authentication can be added later if required)
 */

exports.getEvacueesByDisasterEvacuationEventId = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  console.log(`Fetching evacuees for disaster evacuation event with ID: ${disasterEvacuationEventId}`);

  try {
    // Validate disasterEvacuationEventId
    if (isNaN(disasterEvacuationEventId)) {
      return next(new ApiError(`Invalid disaster evacuation event ID: ${disasterEvacuationEventId}`, 400));
    }

    // Fetch the disaster evacuation event
    const { data: disasterEvacuationEventData, error: disasterEvacuationEventError } = await supabase
      .from('disaster_evacuation_event')
      .select('id, disaster_id')
      .eq('id', disasterEvacuationEventId)
      .single();

    console.log(`Disaster Evacuation Event Data: ${JSON.stringify(disasterEvacuationEventData)}`);
    
    if (disasterEvacuationEventError || !disasterEvacuationEventData) {
      return next(new ApiError(`Disaster evacuation event with ID "${disasterEvacuationEventId}" not found.`, 404));
    }

    const disasterId = disasterEvacuationEventData.disaster_id;
    console.log(`Disaster ID from disaster evacuation event: ${disasterId}`);

    // Fetch the disaster details using the disaster_id
    const { data: disasterData, error: disasterError } = await supabase
      .from('disasters')
      .select('disaster_types(name), name, disaster_start_date')
      .eq('id', disasterId)
      .single();

    console.log(`Disaster Data: ${JSON.stringify(disasterData)}`);

    if (disasterError || !disasterData) {
      return next(new ApiError(`Disaster with ID "${disasterId}" not found.`, 404));
    }

    const disasterType = disasterData?.disaster_types?.name || 'Unknown Type';
    const disasterName = disasterData?.name || 'Unknown Disaster';
    const disasterStartDate = disasterData?.disaster_start_date || 'Unknown Start Date';

    console.log(`Disaster Type: ${disasterType}, Disaster Name: ${disasterName}, Start Date: ${disasterStartDate}`);

    // Fetch the evacuation center details for this disaster evacuation event
    const { data: evacuationCenterData, error: evacuationCenterError } = await supabase
      .from('evacuation_centers')
      .select(`
        name,
        barangays(name),
        evacuation_center_rooms(individual_room_capacity)
      `)
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId);

    if (evacuationCenterError || !evacuationCenterData || evacuationCenterData.length === 0) {
      return next(new ApiError(`No evacuation centers found for disaster evacuation event ID "${disasterEvacuationEventId}".`, 404));
    }

    // Summing up the individual room capacity for all evacuation center rooms
    const totalCapacity = evacuationCenterData.reduce((sum, center) => {
      const roomCapacity = center.evacuation_center_rooms.reduce((roomSum, room) => roomSum + (room.individual_room_capacity || 0), 0);
      return sum + roomCapacity;
    }, 0);

    // Fetch evacuees
    const { data: evacuees, error: evacueesError } = await supabase
      .from('evacuation_registrations')
      .select(`
        id,
        evacuee_resident_id,
        family_head_id,
        arrival_timestamp,
        decampment_timestamp,
        ec_rooms_id,
        evacuee_residents (
          id,
          family_head_id,
          relationship_to_family_head,
          residents (
            first_name,
            last_name,
            birthdate,
            sex,
            barangays(name)
          )
        ),
        family_head (
          id,
          resident_id,
          residents (
            first_name,
            last_name
          )
        ),
        evacuation_center_rooms (
          room_name
        )
      `)
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId);

    if (evacueesError || !evacuees || evacuees.length === 0) {
      return next(new ApiError(`No evacuees found for disaster evacuation event ID "${disasterEvacuationEventId}".`, 404));
    }

    // Construct the summary
    const summary = {
      total_male: 0,
      total_female: 0,
      total_individuals: evacuees.length,
      total_families: evacuees.length,
      infant: 0,
      children: 0,
      youth: 0,
      adult: 0,
      senior_citizens: 0,
      pwd: 0,
      pregnant: 0,
      lactating: 0
    };

    // Process evacuee data
    const transformedEvacuees = await Promise.all(evacuees.map(async (evacuee) => {
      const evacResident = evacuee.evacuee_residents;
      const resident = evacResident?.residents || {};
      const barangay = resident.barangays || {};

      const birthdate = resident.birthdate ? new Date(resident.birthdate) : null;
      const age = birthdate ? Math.floor((Date.now() - birthdate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      const sex = resident.sex || 'Unknown';
      const roomName = evacuee.evacuation_center_rooms?.room_name || 'Unknown Room';
      const decampmentTimestamp = evacuee.decampment_timestamp || null;

      const { data: familyHeadData, error: familyHeadError } = await supabase
        .from('family_head')
        .select('resident_id')
        .eq('id', evacuee.family_head_id)
        .single();

      const familyHeadFullName = familyHeadError || !familyHeadData
        ? 'Unknown'
        : familyHeadData.resident_id;

      // --- Summary Counting ---
      if (sex === 'Male') summary.total_male++;
      else if (sex === 'Female') summary.total_female++;

      if (age !== null) {
        if (age <= 2) summary.infant++;
        else if (age <= 12) summary.children++;
        else if (age <= 17) summary.youth++;
        else if (age <= 59) summary.adult++;
        else summary.senior_citizens++;
      }

      return {
        evacuee_id: evacuee.id,
        evacuee_resident_id: evacResident?.id || null,
        familyHeadId: evacuee.family_head_id,
        roomId: evacuee.ec_rooms_id,
        roomName,
        firstName: resident.first_name || '',
        lastName: resident.last_name || '',
        age,
        barangay_of_origin: barangay.name || 'Unknown',
        sex,
        arrivalTimestamp: evacuee.arrival_timestamp,
        decampmentTimestamp,
        familyHeadFullName
      };
    }));

    // Respond with the data
    return res.status(200).json({
      message: `Successfully retrieved ${evacuees.length} evacuees for disaster evacuation event with ID "${disasterEvacuationEventId}".`,
      disasterType: disasterType,
      disasterName: disasterName,
      disasterStartDate: disasterStartDate,
      evacuationCenterName: evacuationCenterData[0].name,
      barangayName: evacuationCenterData[0].barangays.name,
      totalFamilies: summary.total_families,
      totalEvacuees: summary.total_individuals,
      totalCapacity: totalCapacity,
      summary: summary,
      evacuees: transformedEvacuees
    });

  } catch (err) {
    console.error('Error in getEvacueesByDisasterEvacuationEventId:', err);
    return next(new ApiError('Internal server error while fetching evacuees.', 500));
  }
};


















/**
 * @desc Get detailed disaster evacuation event data filtered by disaster ID,
 * including summary counts, evacuation center details, and assigned user's name.
 * @route GET /api/v1/disaster-events/by-disaster/:disasterId/details
 * @access Public (for now, apply auth middleware later if needed)
 */
exports.getDisasterEventDetailsByDisasterId = async (req, res, next) => {
    const { disasterId } = req.params;

    // Log the incoming disasterId to confirm it's received correctly
    console.log('Received Disaster ID:', disasterId);

    // Check if the disasterId is valid
    if (!disasterId || isNaN(Number(disasterId))) {
        console.error('Invalid Disaster ID provided:', disasterId); // Log invalid disasterId
        return next(new ApiError('Invalid Disaster ID provided.', 400));
    }

    try {
        // Log the query about to be executed for debugging
        console.log(`Querying Supabase for disaster ID: ${disasterId}`);

        // Query Supabase for disaster event data
        const { data, error } = await supabase
            .from(TABLE_NAME) // Disaster_Evacuation_Event
            .select(`
                *,
                evacuation_summaries(
                    total_no_of_family,
                    total_no_of_individuals
                ),
                evacuation_centers(
                    name,
                    total_capacity,
                    barangays(name)
                ),
                users(
                    user_profile:user_profile_id(
                        residents(
                            first_name,
                            middle_name,
                            last_name,
                            suffix
                        )
                    )
                )
            `)
            .eq('disaster_id', disasterId); // Filter by disaster_id

        // Check for errors from Supabase
        if (error) {
            console.error('Supabase Error (getDisasterEventDetailsByDisasterId):', error); // Log Supabase error
            return next(new ApiError('Failed to retrieve detailed disaster event data.', 500));
        }

        // Log the response data from Supabase for debugging
        console.log('Supabase response data:', data);

        // If no data is returned, return a response with a message
        if (!data || data.length === 0) {
            console.log(`No disaster evacuation events found for Disaster ID: ${disasterId}`); // Log when no data is found
            return res.status(200).json({
                message: `No disaster evacuation events found for Disaster ID ${disasterId}.`,
                data: []
            });
        }

        // Transform the data to flatten the nested objects and combine names
        const transformedData = data.map(event => {
            // Extract Summary data
            const summary = event.evacuation_summaries;
            const totalNoOfFamily = summary ? summary.total_no_of_family : 0;
            const totalNoOfIndividuals = summary ? summary.total_no_of_individuals : 0;

            // Extract Evacuation Center data
            const evacuationCenter = event.evacuation_centers;
            const evacuationCenterName = evacuationCenter ? evacuationCenter.name : null;
            const evacuationCenterTotalCapacity = evacuationCenter ? evacuationCenter.total_capacity : 0;
            const evacuationCenterBarangayName = (evacuationCenter && evacuationCenter.barangays) ? evacuationCenter.barangays.name : null;

            // Extract Assigned User Name
            let assignedUserName = null;
            if (event.users && event.users.user_profile && event.users.user_profile.residents) {
                const resident = event.users.user_profile.residents;
                assignedUserName = [
                    resident.first_name,
                    resident.middle_name,
                    resident.last_name,
                    resident.suffix
                ].filter(Boolean).join(' ');
            }

            // Destructure to omit the original nested objects from the final output
            const { evacuation_summaries, evacuation_centers, users, ...rest } = event;

            return {
                ...rest, // Spread all other properties of the Disaster_Evacuation_Event
                total_no_of_family: totalNoOfFamily,
                total_no_of_individuals: totalNoOfIndividuals,
                evacuation_center_name: evacuationCenterName,
                evacuation_center_total_capacity: evacuationCenterTotalCapacity,
                evacuation_center_barangay_name: evacuationCenterBarangayName,
                assigned_user_name: assignedUserName
            };
        });

        // Log the transformed data before sending the response
        console.log('Transformed disaster evacuation data:', transformedData);

        // Send the final response to the frontend
        res.status(200).json({
            message: `Successfully retrieved detailed disaster evacuation events for Disaster ID ${disasterId}.`,
            count: transformedData.length,
            data: transformedData
        });
    } catch (err) {
        // Log any errors during the execution
        console.error('Error during getDisasterEventDetailsByDisasterId:', err);
        next(new ApiError('Internal server error during getDisasterEventDetailsByDisasterId.', 500));
    }
};



/**
 * @desc Get a single detailed disaster evacuation event by its ID,
 * including summary counts, evacuation center details, and assigned user's name.
 * @route GET /api/v1/disaster-events/:id
 * @access Public (for now, apply auth middleware later if needed)
 
exports.getDisasterEventById = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid Disaster Event ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME) // Disaster_Evacuation_Event
            .select(`
                *,
                evacuation_summaries(
                    total_no_of_family,
                    total_no_of_individuals
                ),
                evacuation_centers(
                    name,
                    total_capacity,
                    barangays(name)
                ),
                users(
                    user_profile:user_profile_id(
                        residents(
                            first_name,
                            middle_name,
                            last_name,
                            suffix
                        )
                    )
                )
            `)
            .eq('id', id) // Filter by the primary key 'id'
            .single(); // Use .single() to expect only one row

        if (error) {
            console.error('Supabase Error (getDisasterEventById):', error);
            // If no row found with .single(), Supabase returns a specific error
            if (error.code === 'PGRST116') { // Supabase error code for no rows found with .single()
                return res.status(404).json({
                    message: `Disaster evacuation event with ID ${id} not found.`,
                    data: null
                });
            }
            return next(new ApiError('Failed to retrieve detailed disaster event data.', 500));
        }

        // Transform the data to flatten the nested objects and combine names
        // This logic is similar to getDisasterEventDetailsByDisasterId for consistency
        const event = data; // data is already a single object due to .single()

        // Extract Summary data
        const summary = event.evacuation_summaries; // FIX: Changed from event.Summaries to event.evacuation_summaries
        const totalNoOfFamily = summary ? summary.total_no_of_family : 0;
        const totalNoOfIndividuals = summary ? summary.total_no_of_individuals : 0;

        // Extract Evacuation Center data
        const evacuationCenter = event.evacuation_centers; // FIX: Changed from event.Evacuation_Centers to event.evacuation_centers
        const evacuationCenterName = evacuationCenter ? evacuationCenter.name : null;
        const evacuationCenterTotalCapacity = evacuationCenter ? evacuationCenter.total_capacity : 0;
        const evacuationCenterBarangayName = (evacuationCenter && evacuationCenter.barangays) ? evacuationCenter.barangays.name : null;

        // Extract Assigned User Name - FIX: Changed from event.Users to event.users
        let assignedUserName = null;
        if (event.users && event.users.user_profile && event.users.user_profile.residents) {
            const resident = event.users.user_profile.residents;
            assignedUserName = [
                resident.first_name,
                resident.middle_name,
                resident.last_name,
                resident.suffix
            ].filter(Boolean).join(' ');
        }

        // Destructure to omit the original nested objects from the final output - FIX: Updated property names
        const { evacuation_summaries, evacuation_centers, users, ...rest } = event;

        const transformedData = {
            ...rest, // Spread all other properties of the Disaster_Evacuation_Event
            total_no_of_family: totalNoOfFamily,
            total_no_of_individuals: totalNoOfIndividuals,
            evacuation_center_name: evacuationCenterName,
            evacuation_center_total_capacity: evacuationCenterTotalCapacity,
            evacuation_center_barangay_name: evacuationCenterBarangayName,
            assigned_user_name: assignedUserName
        };

        res.status(200).json({
            message: `Successfully retrieved detailed disaster evacuation event with ID ${id}.`,
            data: transformedData
        });
    } catch (err) {
        next(new ApiError('Internal server error during getDisasterEventById.', 500));
    }
};**/


/**
 * @desc Create a new disaster evacuation event entry
 * @route POST /api/v1/disaster-events
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.createDisasterEvent = async (req, res, next) => {
    const {
        disaster_id,
        assigned_user_id, // This should come from authenticated user in a real app
        evacuation_center_id,
        evacuation_start_date,
        evacuation_end_date // Optional
    } = req.body;

    // Basic input validation
    if (!disaster_id || !assigned_user_id || !evacuation_center_id || !evacuation_start_date) {
        return next(new ApiError('Missing required fields for disaster evacuation event.', 400));
    }

    const newDisasterEventEntry = {
        disaster_id: Number(disaster_id),
        assigned_user_id: Number(assigned_user_id),
        evacuation_center_id: Number(evacuation_center_id),
        evacuation_start_date: new Date(evacuation_start_date).toISOString(),
        evacuation_end_date: evacuation_end_date ? new Date(evacuation_end_date).toISOString() : null,
    };

    try {
        // 1. Create the Disaster Evacuation Event
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([newDisasterEventEntry])
            .select(); // Use .select() to get the inserted row, including its ID

        if (error) {
            console.error(
                'Supabase Error (createDisasterEvent - Event Insert):',
                'Message:', error.message,
                'Details:', error.details,
                'Hint:', error.hint,
                'Code:', error.code,
                'Full Error Object:', error
            );
            if (error.code === '23503') {
                return next(new ApiError('Foreign key constraint failed (e.g., disaster_id, assigned_user_id, or evacuation_center_id does not exist).', 400));
            }
            return next(new ApiError('Failed to create disaster evacuation event entry.', 500));
        }

        const createdEvent = data[0];
        const disasterEvacuationEventId = createdEvent.id; // Get the ID of the newly created event

        // 2. Create a corresponding entry in evacuation_summaries
        const newSummaryEntry = {
            disaster_evacuation_event_id: disasterEvacuationEventId,
            total_no_of_family: 0, // Initialize with 0 or a default value
            total_no_of_individuals: 0, // Initialize with 0 or a default value
            created_at: new Date().toISOString()
        };

        const { error: summaryError } = await supabase
            .from(TABLE_NAME_SUMMARY)
            .insert([newSummaryEntry]);

        if (summaryError) {
            console.error(
                'Supabase Error (createDisasterEvent - Summary Insert):',
                'Message:', summaryError.message,
                'Details:', summaryError.details,
                'Hint:', summaryError.hint,
                'Code:', summaryError.code,
                'Full Error Object:', summaryError
            );
            // Decide how to handle this. You might want to delete the just-created event
            // to maintain data consistency, or just log and proceed. For now, we'll
            // return an error indicating the overall operation failed.
            return next(new ApiError('Failed to create corresponding evacuation summary entry.', 500));
        }

        res.status(201).json({
            message: 'Disaster evacuation event and associated summary entry created successfully.',
            data: createdEvent // Return the created event data
        });
    } catch (err) {
        next(new ApiError('Internal server error during createDisasterEvent.', 500));
    }
};
