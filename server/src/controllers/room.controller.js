// room.controller.js

const { supabase } = require('../config/supabase'); // Import the centralized Supabase client

const TABLE_NAME = 'evacuation_center_rooms'; // IMPORTANT: Ensure this matches your Supabase table name

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
 * @desc Get all evacuation room entries (excluding soft-deleted ones)
 * @route GET /api/v1/rooms
 * @access Public
 */
exports.getAllRooms = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .is('deleted_at', null); // Only retrieve records where deleted_at is NULL

        if (error) {
            console.error('Supabase Error (getAllRooms):', error);
            return next(new ApiError('Failed to retrieve evacuation room entries.', 500));
        }

        if (!data || data.length === 0) {
            return res.status(200).json({ message: 'No active evacuation room entries found.', data: [] });
        }

        res.status(200).json({
            message: 'Successfully retrieved all active evacuation room entries.',
            count: data.length,
            data: data
        });
    } catch (err) {
        next(new ApiError('Internal server error during getAllRooms.', 500));
    }
};

/**
 * @desc Get a single evacuation room entry by ID (excluding soft-deleted ones)
 * @route GET /api/v1/rooms/:id
 * @access Public
 */
exports.getRoomById = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid room ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .is('deleted_at', null) // Only retrieve if not soft-deleted
            .single();

        if (error && error.code === 'PGRST116') {
             return next(new ApiError(`Evacuation room with ID ${id} not found or is deleted.`, 404));
        }
        if (error) {
            console.error('Supabase Error (getRoomById):', error);
            return next(new ApiError('Failed to retrieve evacuation room entry.', 500));
        }

        if (!data) {
            return next(new ApiError(`Evacuation room with ID ${id} not found or is deleted.`, 404));
        }

        res.status(200).json({
            message: `Successfully retrieved evacuation room with ID ${id}.`,
            data: data
        });
    } catch (err) {
        next(new ApiError('Internal server error during getRoomById.', 500));
    }
};

/**
 * @desc Create a new evacuation room entry
 * @route POST /api/v1/rooms
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.createRoom = async (req, res, next) => {
    const {
        evacuation_center_id,
        room_name,
        individual_room_capacity,
        room_type
    } = req.body;

    // Basic input validation
    if (!evacuation_center_id || !room_name || !individual_room_capacity || !room_type) {
        return next(new ApiError('Missing required fields for evacuation room.', 400));
    }

    const newRoomEntry = {
        evacuation_center_id: Number(evacuation_center_id),
        room_name,
        individual_room_capacity: Number(individual_room_capacity),
        room_type,
        created_at: new Date().toISOString(),
        deleted_at: null // Ensure new entries are not marked as deleted
    };

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([newRoomEntry])
            .select();

        if (error) {
            console.error('Supabase Error (createRoom):', error);
            if (error.code === '23503') { // PostgreSQL foreign key violation error code
                return next(new ApiError('Foreign key constraint failed (evacuation_center_id does not exist).', 400));
            }
            return next(new ApiError('Failed to create evacuation room entry.', 500));
        }

        res.status(201).json({
            message: 'Evacuation room entry created successfully.',
            data: data[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during createRoom.', 500));
    }
};

/**
 * @desc Update an existing evacuation room entry
 * @route PUT /api/v1/rooms/:id
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.updateRoom = async (req, res, next) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid room ID provided.', 400));
    }

    // Ensure numeric fields are converted if present in updates
    if (updates.evacuation_center_id !== undefined) updates.evacuation_center_id = Number(updates.evacuation_center_id);
    if (updates.individual_room_capacity !== undefined) updates.individual_room_capacity = Number(updates.individual_room_capacity);

    updates.updated_at = new Date().toISOString();
    // Prevent direct update of deleted_at via PUT, use soft-delete endpoint
    if (updates.deleted_at !== undefined) delete updates.deleted_at;


    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(updates)
            .eq('id', id)
            .is('deleted_at', null) // Only update if not soft-deleted
            .select();

        if (error && error.code === 'PGRST116') {
             return next(new ApiError(`Evacuation room with ID ${id} not found for update or is deleted.`, 404));
        }
        if (error) {
            console.error('Supabase Error (updateRoom):', error);
            if (error.code === '23503') { // PostgreSQL foreign key violation error code
                return next(new ApiError('Foreign key constraint failed (evacuation_center_id does not exist).', 400));
            }
            return next(new ApiError('Failed to update evacuation room entry.', 500));
        }

        if (!data || data.length === 0) {
            return next(new ApiError(`Evacuation room with ID ${id} not found for update or is deleted.`, 404));
        }

        res.status(200).json({
            message: `Evacuation room with ID ${id} updated successfully.`,
            data: data[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during updateRoom.', 500));
    }
};

/**
 * @desc Delete an evacuation room entry (Hard Delete - use with caution!)
 * @route DELETE /api/v1/rooms/:id
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.deleteRoom = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid room ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error('Supabase Error (deleteRoom):', error);
            return next(new ApiError('Failed to delete evacuation room entry.', 500));
        }

        if (!data || data.length === 0) {
            return next(new ApiError(`Evacuation room with ID ${id} not found for deletion.`, 404));
        }

        res.status(200).json({
            message: `Evacuation room with ID ${id} deleted successfully.`
        });
    } catch (err) {
        next(new ApiError('Internal server error during deleteRoom.', 500));
    }
};

/**
 * @desc Soft-delete an evacuation room entry by marking it as deleted
 * @route PATCH /api/v1/rooms/:id/soft-delete
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.softDeleteRoom = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return next(new ApiError('Invalid room ID provided for soft delete.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update({ deleted_at: new Date().toISOString() }) // Set deleted_at timestamp
            .eq('id', id)
            .is('deleted_at', null) // Ensure it's not already soft-deleted
            .select();

        if (error && error.code === 'PGRST116') {
             return next(new ApiError(`Evacuation room with ID ${id} not found for soft deletion or already deleted.`, 404));
        }
        if (error) {
            console.error('Supabase Error (softDeleteRoom):', error);
            return next(new ApiError('Failed to soft-delete evacuation room entry.', 500));
        }

        if (!data || data.length === 0) {
            return next(new ApiError(`Evacuation room with ID ${id} not found for soft deletion or already deleted.`, 404));
        }

        res.status(200).json({
            message: `Evacuation room with ID ${id} soft-deleted successfully.`,
            data: data[0]
        });
    } catch (err) {
        next(new ApiError('Internal server error during softDeleteRoom.', 500));
    }
};

/**
 * @desc Get all evacuation room entries for a specific evacuation center (excluding soft-deleted ones)
 * @route GET /api/v1/rooms/by-center/:evacuationCenterId
 * @access Public
 */
exports.getRoomsByEvacuationCenterId = async (req, res, next) => {
    const { evacuationCenterId } = req.params;

    if (!evacuationCenterId || isNaN(Number(evacuationCenterId))) {
        return next(new ApiError('Invalid evacuation center ID provided.', 400));
    }

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('evacuation_center_id', evacuationCenterId) // Filter by evacuation_center_id
            .is('deleted_at', null); // Only retrieve active (non-soft-deleted) rooms

        if (error) {
            console.error('Supabase Error (getRoomsByEvacuationCenterId):', error);
            return next(new ApiError('Failed to retrieve rooms for the specified evacuation center.', 500));
        }

        if (!data || data.length === 0) {
            return res.status(200).json({
                message: `No active rooms found for evacuation center ID ${evacuationCenterId}.`,
                data: []
            });
        }

        res.status(200).json({
            message: `Successfully retrieved active rooms for evacuation center ID ${evacuationCenterId}.`,
            count: data.length,
            data: data
        });
    } catch (err) {
        next(new ApiError('Internal server error during getRoomsByEvacuationCenterId.', 500));
    }
};