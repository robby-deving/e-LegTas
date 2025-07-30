// evacuationCenter.controller.js

// Import the centralized Supabase client
const supabase = require('../config/supabase'); 

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
 */
exports.getAllEvacuationCenters = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*');

        if (error) {
            console.error('Supabase Error (getAllEvacuationCenters):', error);
            return next(new ApiError('Failed to retrieve evacuation center entries.', 500));
        }

        if (!data || data.length === 0) {
            return res.status(200).json({ message: 'No evacuation center entries found.', data: [] });
        }

        res.status(200).json({
            message: 'Successfully retrieved all evacuation center entries.',
            count: data.length,
            data: data
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
        camp_manager_id,
        total_capacity,
        created_by
    } = req.body;

    if (!name || !address || !barangay_id || !latitude || !longitude || !ec_status || !category || !created_by) {
        return next(new ApiError('Missing required fields for evacuation center.', 400));
    }

    const newEvacuationCenterEntry = {
        name,
        address,
        barangay_id: Number(barangay_id),
        latitude: Number(latitude),
        longitude: Number(longitude),
        ec_status,
        category,
        camp_manager_id: camp_manager_id ? Number(camp_manager_id) : null,
        total_capacity: Number(total_capacity),
        created_by: Number(created_by),
        created_at: new Date().toISOString()
    };

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

exports.getEvacuationCenterMapData = async (req, res, next) => {
    try {
        const { data, error } = await supabase
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
            `);

        if (error) {
            console.error('Supabase Error (getEvacuationCenterMapData):', error);
            return next(new ApiError('Failed to retrieve detailed evacuation center data.', 500));
        }

        // Transform the data to flatten the nested objects and combine names
        const transformedData = data.map(ec => {
            const barangayName = ec.barangays ? ec.barangays.name : null;
            let campManagerName = null;
            let campManagerPhoneNumber = null; // New variable for phone number

            if (ec.camp_managers && ec.camp_managers.user_profile) {
                const userProfile = ec.camp_managers.user_profile;
                campManagerPhoneNumber = userProfile.phone_number || null; // Get phone number

                if (userProfile.residents) {
                    const resident = userProfile.residents;
                    campManagerName = [
                        resident.first_name,
                        resident.middle_name, // Middle name can be null
                        resident.last_name,
                        resident.suffix // Suffix can be null
                    ].filter(Boolean).join(' '); // Filter out nulls and join
                }
            }

            // Create a new object without the nested Supabase join structure
            // Use object destructuring to omit the original nested objects
            const { barangays, camp_managers, ...rest } = ec;

            return {
                ...rest, // Spread all other properties of the evacuation center
                barangay_name: barangayName,
                camp_manager_name: campManagerName,
                camp_manager_phone_number: campManagerPhoneNumber // Include phone number
            };
        });

        res.status(200).json({
            message: 'Successfully retrieved detailed evacuation center map data.',
            count: transformedData.length,
            data: transformedData
        });
    } catch (err) {
        next(new ApiError('Internal server error during getEvacuationCenterMapData.', 500));
    }
};