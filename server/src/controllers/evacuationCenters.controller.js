// evacuation.controller.js

// Import the centralized Supabase client
const { supabase } = require('../config/supabase'); 

// Define the table name for evacuation centers
const TABLE_NAME = 'evacuation_centers'; 
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
 * @desc Get all evacuation center entries
 * @route GET /api/v1/evacuation-centers
 * @access Public
 * @query {number} limit - Number of records to return (default: 10)
 * @query {number} offset - Number of records to skip (default: 0)
 * @query {string} search - Search term for name or address
 * @query {boolean} include_deleted - Include soft-deleted records (default: false)
 */
exports.getAllEvacuationCenters = async (req, res, next) => {
    try {
        // Parse query parameters
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';
        const includeSoftDeleted = req.query.include_deleted === 'true';
        const ecType = req.query.ec_type;
        const barangayId = req.query.barangay_id ? parseInt(req.query.barangay_id) : null;

        let query = supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact' });

        // Only add the filter if we don't want to include soft-deleted records
        if (!includeSoftDeleted) {
            query = query.is('deleted_at', null);
        }

        // Add search filter if provided
        if (search) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        // Add ec_type filter if provided
        if (ecType === 'inside') {
            query = query.in('category', ['School', 'Chapel/Church', 'Dedicated Evacuation Center', 'Government Building']);
        } else if (ecType === 'outside') {
            query = query.in('category', ['Private House']);
        }

        // Add barangay filter if provided
        if (barangayId && !isNaN(barangayId)) {
            query = query.eq('barangay_id', barangayId);
        }

        // Add pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('Supabase Error (getAllEvacuationCenters):', error);
            return next(new ApiError('Failed to retrieve evacuation center entries.', 500));
        }

        // Get total count for pagination metadata
        let totalCount = count;
        if (search || !includeSoftDeleted || barangayId || ecType) {
            // If we have search, deleted_at, barangay, or ec_type filter, we need to get the total count separately
            let countQuery = supabase
                .from(TABLE_NAME)
                .select('*', { count: 'exact', head: true });

            if (!includeSoftDeleted) {
                countQuery = countQuery.is('deleted_at', null);
            }

            if (search) {
                countQuery = countQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
            }

            if (barangayId && !isNaN(barangayId)) {
                countQuery = countQuery.eq('barangay_id', barangayId);
            }

            // Add ec_type filter if provided
            if (ecType === 'inside') {
                countQuery = countQuery.in('category', ['School', 'Chapel/Church', 'Dedicated Evacuation Center', 'Government Building']);
            } else if (ecType === 'outside') {
                countQuery = countQuery.in('category', ['Private House']);
            }

            const { count: filteredCount } = await countQuery;
            totalCount = filteredCount;
        }

        if (!data || data.length === 0) {
            return res.status(200).json({
                message: 'No evacuation center entries found.',
                data: [],
                pagination: {
                    total: totalCount || 0,
                    limit,
                    offset,
                    totalPages: Math.ceil((totalCount || 0) / limit),
                    currentPage: Math.floor(offset / limit) + 1
                }
            });
        }

        res.status(200).json({
            message: 'Successfully retrieved evacuation center entries.',
            count: data.length,
            data: data,
            pagination: {
                total: totalCount || 0,
                limit,
                offset,
                totalPages: Math.ceil((totalCount || 0) / limit),
                currentPage: Math.floor(offset / limit) + 1
            }
        });
    } catch (err) {
        next(new ApiError('Internal server error during getAllEvacuationCenters.', 500));
    }
};

/**
 * @desc Get a single evacuation center entry by ID
 * @route GET /api/v1/evacuation-centers/:id
 * @access Public
 */
exports.getEvacuationCenterById = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .is('deleted_at', null) // Exclude soft-deleted records
            .single();

        if (error && error.code === 'PGRST116') {
             return next(new ApiError(`Evacuation center with ID ${id} not found.`, 404));
        }
        if (error) {
            console.error('Supabase Error (getEvacuationCenterById):', error);
            return next(new ApiError('Failed to retrieve evacuation center entry.', 500));
        }

        if (!data) {
            return next(new ApiError(`Evacuation center with ID ${id} not found.`, 404));
        }

        res.status(200).json({
            message: `Successfully retrieved evacuation center with ID ${id}.`,
            data: data
        });
    } catch (err) {
        next(new ApiError('Internal server error during getEvacuationCenterById.', 500));
    }
};

/**
 * @desc Create a new evacuation center entry
 * @route POST /api/v1/evacuation-centers
 * @access Private (requires authentication/authorization)
 */
exports.createEvacuationCenter = async (req, res, next) => {
    const {
        name,
        address,
        barangay_id,
        latitude,
        longitude,
        ec_status,
        category,
        total_capacity,
        created_by
    } = req.body;

    // Check if all required fields are present
    if (!name || !address || !barangay_id || !ec_status || !category || !created_by) {
        return next(new ApiError('Missing required fields for evacuation center.', 400));
    }

    // For non-Private House categories, validate additional required fields
    if (category !== 'Private House' && (!latitude || !longitude || !total_capacity)) {
        return next(new ApiError('Latitude, longitude, and total capacity are required for non-Private House evacuation centers.', 400));
    }

    const newEvacuationCenterEntry = {
        name,
        address,
        barangay_id: Number(barangay_id),
        ec_status,
        category,
        assigned_user_id: null,
        created_by: Number(created_by),
        created_at: new Date().toISOString()
    };

    // Add optional fields for non-Private House categories
    if (category !== 'Private House') {
        newEvacuationCenterEntry.latitude = Number(latitude);
        newEvacuationCenterEntry.longitude = Number(longitude);
        newEvacuationCenterEntry.total_capacity = Number(total_capacity);
    } else {
        // For Private House, add these fields if provided, otherwise set to null
        newEvacuationCenterEntry.latitude = latitude ? Number(latitude) : null;
        newEvacuationCenterEntry.longitude = longitude ? Number(longitude) : null;
        newEvacuationCenterEntry.total_capacity = total_capacity ? Number(total_capacity) : null;
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([newEvacuationCenterEntry])
            .select();

        if (error) {
            console.error('Supabase Error (createEvacuationCenter):', error);
            if (error.code === '23503') {
                return next(new ApiError('Foreign key constraint failed (e.g., barangay_id or created_by does not exist).', 400));
            }
            return next(new ApiError('Failed to create evacuation center entry.', 500));
        }

        res.status(201).json({
            message: 'Evacuation center entry created successfully.',
            data: data[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during createEvacuationCenter.', 500));
    }
};

/**
 * @desc Update an existing evacuation center entry
 * @route PUT /api/v1/evacuation-centers/:id
 * @access Private (requires authentication/authorization)
 */
exports.updateEvacuationCenter = async (req, res, next) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    if (updates.barangay_id !== undefined) updates.barangay_id = Number(updates.barangay_id);
    if (updates.latitude !== undefined) updates.latitude = Number(updates.latitude);
    if (updates.longitude !== undefined) updates.longitude = Number(updates.longitude);
    if (updates.camp_manager_id !== undefined) updates.camp_manager_id = Number(updates.camp_manager_id);
    if (updates.created_by !== undefined) updates.created_by = Number(updates.created_by);
    if (updates.total_capacity !== undefined) updates.total_capacity = Number(updates.total_capacity);



    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(updates)
            .eq('id', id)
            .is('deleted_at', null) // Only update if not soft-deleted
            .select();

        if (error && error.code === 'PGRST116') {
             return next(new ApiError(`Evacuation center with ID ${id} not found for update.`, 404));
        }
        if (error) {
            console.error('Supabase Error (updateEvacuationCenter):', error);
            return next(new ApiError('Failed to update evacuation center entry.', 500));
        }

        if (!data || data.length === 0) {
            return next(new ApiError(`Evacuation center with ID ${id} not found.`, 404));
        }

        res.status(200).json({
            message: `Evacuation center with ID ${id} updated successfully.`,
            data: data[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during updateEvacuationCenter.', 500));
    }
};

/**
 * @desc Delete an evacuation center entry
 * @route DELETE /api/v1/evacuation-centers/:id
 * @access Private (requires authentication/authorization)
 */
exports.deleteEvacuationCenter = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    try {
        // Changed to destructure 'data' instead of 'count'
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id)
            .is('deleted_at', null) // Only delete if not soft-deleted
            .select(); // Returns the deleted row(s) in 'data'

        if (error) {
            console.error('Supabase Error (deleteEvacuationCenter):', error);
            return next(new ApiError('Failed to delete evacuation center entry.', 500));
        }

        if (!data || data.length === 0) {
            return next(new ApiError(`Evacuation center with ID ${id} not found for deletion.`, 404));
        }

        res.status(200).json({
            message: `Evacuation center with ID ${id} deleted successfully.`
        });
    } catch (err) {
        next(new ApiError('Internal server error during deleteEvacuationCenter.', 500));
    }
};

/**
 * @desc Soft delete an evacuation center entry
 * @route PUT /api/v1/evacuation-centers/:id/soft-delete
 * @access Private (requires authentication/authorization)
 */
exports.softDeleteEvacuationCenter = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    try {
        // Start a Supabase transaction by using multiple operations
        const now = new Date().toISOString();

        // 1. First soft delete all associated rooms
        const { error: roomsError } = await supabase
            .from('evacuation_center_rooms')
            .update({ 
                deleted_at: now
            })
            .eq('evacuation_center_id', id)
            .is('deleted_at', null);

        if (roomsError) {
            console.error('Supabase Error (softDeleteRooms):', roomsError);
            return next(new ApiError('Failed to soft delete associated rooms.', 500));
        }

        // 2. Then soft delete the evacuation center
        const { data, error: centerError } = await supabase
            .from(TABLE_NAME)
            .update({ 
                deleted_at: now,
                ec_status: 'Unavailable' // Update status to Unavailable when soft deleted
            })
            .eq('id', id)
            .is('deleted_at', null) // Only soft delete if not already deleted
            .select();

        if (centerError) {
            console.error('Supabase Error (softDeleteEvacuationCenter):', {
                error: centerError,
                details: centerError.details,
                hint: centerError.hint,
                code: centerError.code
            });
            if (centerError.code === '23503') {
                return next(new ApiError('Cannot delete: This evacuation center is referenced by other records.', 400));
            }
            if (centerError.code === '23505') {
                return next(new ApiError('Cannot delete: Duplicate key violation.', 400));
            }
            return next(new ApiError(`Failed to soft delete evacuation center entry: ${centerError.message}`, 500));
        }

        if (!data || data.length === 0) {
            return next(new ApiError(`Evacuation center with ID ${id} not found or already deleted.`, 404));
        }

        res.status(200).json({
            message: `Evacuation center with ID ${id} and all its rooms soft deleted successfully.`,
            data: data[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during softDeleteEvacuationCenter.', 500));
    }
};

/**
 * @desc Restore a soft-deleted evacuation center
 * @route PUT /api/v1/evacuation-centers/:id/restore
 * @access Private (requires authentication/authorization)
 */
exports.restoreEvacuationCenter = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    try {
        // 1. First restore the evacuation center
        const { data: centerData, error: centerError } = await supabase
            .from(TABLE_NAME)
            .update({ 
                deleted_at: null,
                ec_status: 'Available' // Update status to Available when restored
            })
            .eq('id', id)
            .not('deleted_at', 'is', null) // Only restore if currently deleted
            .select();

        if (centerError) {
            console.error('Supabase Error (restoreEvacuationCenter):', centerError);
            return next(new ApiError('Failed to restore evacuation center entry.', 500));
        }

        if (!centerData || centerData.length === 0) {
            return next(new ApiError(`Evacuation center with ID ${id} not found or not deleted.`, 404));
        }

        // 2. Then restore all associated rooms
        const { error: roomsError } = await supabase
            .from('evacuation_center_rooms')
            .update({ 
                deleted_at: null
            })
            .eq('evacuation_center_id', id)
            .not('deleted_at', 'is', null);

        if (roomsError) {
            console.error('Supabase Error (restoreRooms):', roomsError);
            return next(new ApiError('Failed to restore associated rooms.', 500));
        }

        res.status(200).json({
            message: `Evacuation center with ID ${id} and all its rooms restored successfully.`,
            data: centerData[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during restoreEvacuationCenter.', 500));
    }
};
exports.getEvacuationCenterMapData = async (req, res, next) => {
    try {
        // First, get all active evacuation centers with their basic data
        const { data: centers, error: centersError } = await supabase
            .from(TABLE_NAME) // evacuation_centers
            .select(`
                *,
                barangays(name),
                users:assigned_user_id(
                    user_profile:user_profile_id(
                        residents:resident_id(
                            first_name,
                            middle_name,
                            last_name,
                            suffix
                        ),
                        phone_number
                    )
                )
            `)
            .is('deleted_at', null) // Only get active (non-deleted) evacuation centers
            .neq('category', 'Private House'); // Exclude Private House category

        if (centersError) {
            console.error('Supabase Error (getEvacuationCenterMapData - centers):', centersError);
            return next(new ApiError('Failed to retrieve evacuation center data.', 500));
        }

        if (!centers || centers.length === 0) {
            return res.status(200).json({
                message: 'No evacuation centers found.',
                count: 0,
                data: []
            });
        }

        // Get all active disaster evacuation events for these centers
        const centerIds = centers.map(center => center.id);
        const { data: activeEvents, error: eventsError } = await supabase
            .from('disaster_evacuation_event')
            .select('id, evacuation_center_id')
            .in('evacuation_center_id', centerIds)
            .is('evacuation_end_date', null);

        if (eventsError) {
            console.error('Supabase Error (getEvacuationCenterMapData - active events):', eventsError);
            return next(new ApiError('Failed to retrieve active disaster events.', 500));
        }

        // Get the latest evacuation summaries for these events
        let currentCapacities = {};
        if (activeEvents && activeEvents.length > 0) {
            const eventIds = activeEvents.map(event => event.id);
            const { data: summaries, error: summariesError } = await supabase
                .from('evacuation_summaries')
                .select('disaster_evacuation_event_id, total_no_of_individuals, created_at')
                .in('disaster_evacuation_event_id', eventIds)
                .order('created_at', { ascending: false });

            if (summariesError) {
                console.error('Supabase Error (getEvacuationCenterMapData - summaries):', summariesError);
                return next(new ApiError('Failed to retrieve evacuation summaries.', 500));
            }

            // Group summaries by evacuation center and get the latest one for each
            const summariesByEvent = {};
            summaries?.forEach(summary => {
                if (!summariesByEvent[summary.disaster_evacuation_event_id]) {
                    summariesByEvent[summary.disaster_evacuation_event_id] = summary;
                }
            });

            // Map summaries to centers
            activeEvents.forEach(event => {
                if (summariesByEvent[event.id]) {
                    currentCapacities[event.evacuation_center_id] = summariesByEvent[event.id].total_no_of_individuals;
                }
            });
        }

        // Transform the data to flatten the nested objects and combine names
        const transformedData = centers.map(ec => {
            const barangayName = ec.barangays ? ec.barangays.name : null;
            let campManagerName = null;
            let campManagerPhoneNumber = null;

            if (ec.users && ec.users.user_profile) {
                const userProfile = ec.users.user_profile;
                campManagerPhoneNumber = userProfile.phone_number || null;

                if (userProfile.residents) {
                    const resident = userProfile.residents;
                    const nameParts = [
                        resident.first_name,
                        resident.middle_name,
                        resident.last_name,
                        resident.suffix
                    ].filter(Boolean);
                    
                    campManagerName = nameParts.join(' ');
                }
            }

            // Create a new object without the nested Supabase join structure
            // Use object destructuring to omit the original nested objects
            const { barangays, camp_managers, ...rest } = ec;

            return {
                ...rest, // Spread all other properties of the evacuation center
                barangay_name: barangayName,
                camp_manager_name: campManagerName,
                camp_manager_phone_number: campManagerPhoneNumber,
                current_capacity: currentCapacities[ec.id] || 0 // Add current capacity from summaries
            };
        });

        res.status(200).json({
            message: 'Successfully retrieved detailed evacuation center map data.',
            count: transformedData.length,
            data: transformedData
        });
    } catch (err) {
        console.error('Internal server error during getEvacuationCenterMapData:', err);
        next(new ApiError('Internal server error during getEvacuationCenterMapData.', 500));
    }
};

/**
 * @desc Get evacuation center with its rooms
 * @route GET /api/v1/evacuation-centers/:id/rooms
 * @access Public
 */
exports.getEvacuationCenterWithRooms = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                *,
                evacuation_center_rooms(
                    id,
                    room_name,
                    individual_room_capacity,
                    room_type,
                    created_at,
                    updated_at,
                    deleted_at
                )
            `)
            .eq('id', id)
            .is('deleted_at', null) // Exclude soft-deleted centers
            .is('evacuation_center_rooms.deleted_at', null) // Exclude soft-deleted rooms
            .single();

        if (error) {
            console.error('Supabase Error (getEvacuationCenterWithRooms):', error);
            return next(new ApiError('Failed to retrieve evacuation center with rooms.', 500));
        }

        if (!data) {
            return next(new ApiError(`Evacuation center with ID ${id} not found.`, 404));
        }

        // Filter out any rooms that might have deleted_at set
        const centerData = {
            ...data,
            evacuation_center_rooms: (data.evacuation_center_rooms || [])
                .filter(room => !room.deleted_at)
        };

        res.status(200).json({
            message: `Successfully retrieved evacuation center with ID ${id} and its rooms.`,
            data: centerData
        });
    } catch (err) {
        next(new ApiError('Internal server error during getEvacuationCenterWithRooms.', 500));
    }
};

/**
 * @desc Get assigned evacuation center ID for a user
 * @route GET /api/v1/evacuation-centers/user/:userId
 * @access Private (requires authentication/authorization)
 * @param {number} userId - User ID to find assigned evacuation center for
 * @returns {object} Response with evacuation_center_id or null if not assigned
 */
exports.getAssignedEvacuationCenter = async (req, res, next) => {
    const { userId } = req.params;

    if (!userId || isNaN(Number(userId))) {
        return next(new ApiError('Invalid user ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id')
            .eq('assigned_user_id', userId)
            .is('deleted_at', null) // Only get active centers
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is okay
            console.error('Supabase Error (getAssignedEvacuationCenter):', error);
            return next(new ApiError('Failed to retrieve assigned evacuation center.', 500));
        }

        const evacuationCenterId = data ? data.id : null;

        res.status(200).json({
            message: data 
                ? `Successfully retrieved assigned evacuation center ID for user ${userId}.`
                : `No evacuation center assigned to user ${userId}.`,
            evacuation_center_id: evacuationCenterId
        });
    } catch (err) {
        next(new ApiError('Internal server error during getAssignedEvacuationCenter.', 500));
    }
};