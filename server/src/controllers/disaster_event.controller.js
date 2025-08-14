// disaster_event.controller.js

const { supabase } = require('../config/supabase'); // Import the centralized Supabase client
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
 * @desc Get detailed disaster evacuation event data filtered by disaster ID,
 * including summary counts, evacuation center details, and assigned user's name.
 * @route GET /api/v1/disaster-events/by-disaster/:disasterId/details
 * @access Public (for now, apply auth middleware later if needed)
 */
exports.getDisasterEventDetailsByDisasterId = async (req, res, next) => {
    const { disasterId } = req.params;

    if (!disasterId || isNaN(Number(disasterId))) {
        return next(new ApiError('Invalid Disaster ID provided.', 400));
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
            .eq('disaster_id', disasterId); // Filter by disaster_id

        if (error) {
            console.error('Supabase Error (getDisasterEventDetailsByDisasterId):', error);
            return next(new ApiError('Failed to retrieve detailed disaster event data.', 500));
        }

        if (!data || data.length === 0) {
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

        res.status(200).json({
            message: `Successfully retrieved detailed disaster evacuation events for Disaster ID ${disasterId}.`,
            count: transformedData.length,
            data: transformedData
        });
    } catch (err) {
        next(new ApiError('Internal server error during getDisasterEventDetailsByDisasterId.', 500));
    }
};

/**
 * @desc Get a single detailed disaster evacuation event by its ID,
 * including summary counts, evacuation center details, and assigned user's name.
 * @route GET /api/v1/disaster-events/:id
 * @access Public (for now, apply auth middleware later if needed)
 */
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
};


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