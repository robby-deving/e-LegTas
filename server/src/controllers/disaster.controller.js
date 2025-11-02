// disaster.controller.js

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const { createCache, generateCacheKey, invalidateCacheByPattern } = require('../utils/cache');

const TABLE_NAME = 'disasters';

// Initialize LRU cache with 1-hour TTL
const disasterCache = createCache({
    max: 500, // Maximum 500 items in cache
    ttl: 1000 * 60 * 60, // 1 hour TTL
}); 

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
 * @desc Get all disaster entries or filter by month and year
 * @route GET /api/v1/disasters
 * @access Public
 * @query {month?: number, year: number} - Optional month (0-11) and required year for filtering
 */
exports.getAllDisasters = async (req, res, next) => {
    try {
        // Use validated query
        const { month, year } = req.validatedQuery || req.query;
        
        // Generate cache key based on query parameters
        const cacheKey = generateCacheKey('disasters:all', { month, year });
        
        // Check cache first
        const cachedData = disasterCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for getAllDisasters', { cacheKey, count: cachedData.length });
            return res.status(200).json({
                message: year !== undefined
                    ? `Successfully retrieved disaster entries for ${month !== undefined ? `month ${parseInt(month) + 1}/` : ''}${year}.`
                    : 'Successfully retrieved all disaster entries.',
                count: cachedData.length,
                data: cachedData,
                cached: true
            });
        }
        
        logger.debug('Cache miss for getAllDisasters', { cacheKey });
        
        let query = supabase
            .from(TABLE_NAME)
            .select(`
                *,
                disaster_types(name) // Join to get the name of the disaster type
            `)
            .is('deleted_at', null); // Only get active disasters (not soft-deleted)

        // If month and year are provided, filter by disaster_start_date
        if (year !== undefined) {
            const startDate = new Date(parseInt(year), month !== undefined ? parseInt(month) : 0, 1);
            const endDate = new Date(parseInt(year), month !== undefined ? parseInt(month) + 1 : 12, 1);

            query = query
                .gte('disaster_start_date', startDate.toISOString())
                .lt('disaster_start_date', endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            logger.error('Supabase Error (getAllDisasters):', { error: error.message, details: error });
            return next(new ApiError('Failed to retrieve disaster entries.', 500));
        }

        if (!data || data.length === 0) {
            logger.info('No disaster entries found');
            return res.status(200).json({ message: 'No disaster entries found.', data: [] });
        }

        // Transform the data to flatten the nested disaster_types object
        const transformedData = data.map(disaster => {
            const disasterTypeName = disaster.disaster_types ? disaster.disaster_types.name : null;
            const { disaster_types, ...rest } = disaster; // Destructure to omit the nested object

            return {
                ...rest, // Spread all other properties of the disaster
                disaster_type_name: disasterTypeName // Add the flattened disaster type name
            };
        });

        // Store in cache
        disasterCache.set(cacheKey, transformedData);
        logger.debug('Data cached for getAllDisasters', { cacheKey, count: transformedData.length });

        logger.info('Successfully retrieved disaster entries', { count: transformedData.length, year, month });
        logger.debug('Disaster entries data', { data: transformedData });
        
        res.status(200).json({
            message: year !== undefined
                ? `Successfully retrieved disaster entries for ${month !== undefined ? `month ${parseInt(month) + 1}/` : ''}${year}.`
                : 'Successfully retrieved all disaster entries.',
            count: transformedData.length,
            data: transformedData
        });
    } catch (err) {
        logger.error('Internal server error during getAllDisasters', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during getAllDisasters.', 500));
    }
};

/**
 * @desc Get a single disaster entry by ID
 * @route GET /api/v1/disasters/:id
 * @access Public
 */
exports.getDisasterById = async (req, res, next) => {
    // Use validated params
    const { id } = req.validatedParams || req.params;

    if (!id || isNaN(Number(id))) {
        logger.warn('Invalid disaster ID provided', { id });
        return next(new ApiError('Invalid disaster ID provided.', 400));
    }

    try {
        // Generate cache key for this specific disaster
        const cacheKey = generateCacheKey('disasters:id', id);
        
        // Check cache first
        const cachedData = disasterCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for getDisasterById', { cacheKey, id });
            return res.status(200).json({
                message: `Successfully retrieved disaster with ID ${id}.`,
                data: cachedData,
                cached: true
            });
        }
        
        logger.debug('Cache miss for getDisasterById', { cacheKey, id });
        
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                *,
                disaster_types(name) // Join to get the name of the disaster type
            `)
            .eq('id', id)
            .is('deleted_at', null) // Only get active disasters (not soft-deleted)
            .single();

        if (error && error.code === 'PGRST116') {
             logger.warn('Disaster not found', { id, code: error.code });
             return next(new ApiError(`Disaster with ID ${id} not found.`, 404));
        }
        if (error) {
            logger.error('Supabase Error (getDisasterById):', { error: error.message, details: error, id });
            return next(new ApiError('Failed to retrieve disaster entry.', 500));
        }

        if (!data) {
            logger.warn('Disaster not found', { id });
            return next(new ApiError(`Disaster with ID ${id} not found.`, 404));
        }

        // Transform the single data object to flatten the nested disaster_types object
        const disasterTypeName = data.disaster_types ? data.disaster_types.name : null;
        const { disaster_types, ...rest } = data; // Destructure to omit the nested object
        const transformedData = {
            ...rest,
            disaster_type_name: disasterTypeName
        };

        // Store in cache
        disasterCache.set(cacheKey, transformedData);
        logger.debug('Data cached for getDisasterById', { cacheKey, id });

        logger.debug('Successfully retrieved disaster by ID', { id });
        logger.debug('Disaster data', { data: transformedData });
        
        res.status(200).json({
            message: `Successfully retrieved disaster with ID ${id}.`,
            data: transformedData
        });
    } catch (err) {
        logger.error('Internal server error during getDisasterById', { error: err.message, stack: err.stack, id });
        next(new ApiError('Internal server error during getDisasterById.', 500));
    }
};

/**
 * @desc Create a new disaster entry
 * @route POST /api/v1/disasters
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.createDisaster = async (req, res, next) => {
    // Use validated body
    const {
        disaster_name,
        disaster_type_id,
        disaster_start_date,
        disaster_end_date 
    } = req.validatedBody || req.body;

    // Basic input validation
    if (!disaster_name || !disaster_type_id || !disaster_start_date) {
        logger.warn('Missing required fields for disaster creation', { disaster_name, disaster_type_id, disaster_start_date });
        return next(new ApiError('Missing required fields for disaster.', 400));
    }

    const newDisasterEntry = {
        disaster_name,
        disaster_type_id: Number(disaster_type_id),
        disaster_start_date: new Date(disaster_start_date).toISOString(),
        disaster_end_date: disaster_end_date ? new Date(disaster_end_date).toISOString() : null,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([newDisasterEntry])
            .select();

        if (error) {
            if (error.code === '23503') { // PostgreSQL foreign key violation error code
                logger.warn('Foreign key constraint failed during disaster creation', { error: error.message, disaster_type_id });
                return next(new ApiError('Foreign key constraint failed (disaster_type_id does not exist).', 400));
            }
            logger.error('Supabase Error (createDisaster):', { error: error.message, details: error });
            return next(new ApiError('Failed to create disaster entry.', 500));
        }

        // Invalidate all disaster-related caches since a new disaster was created
        invalidateCacheByPattern(disasterCache, 'disasters:');
        logger.info('Cache invalidated after disaster creation');

        logger.debug('Disaster entry created successfully', { disaster_id: data[0].id, disaster_name });
        logger.debug('Created disaster data', { data: data[0] });
        
        res.status(201).json({
            message: 'Disaster entry created successfully.',
            data: data[0]
        });
    } catch (err) {
        logger.error('Internal server error during createDisaster', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during createDisaster.', 500));
    }
};

/**
 * @desc Update an existing disaster entry
 * @route PUT /api/v1/disasters/:id
 * @access Private (requires authentication/authorization, but public for now)
 */
exports.updateDisaster = async (req, res, next) => {
    // Use validated params and body
    const { id } = req.validatedParams || req.params;
    const updates = req.validatedBody || req.body;

    if (!id || isNaN(Number(id))) {
        logger.warn('Invalid disaster ID provided for update', { id });
        return next(new ApiError('Invalid disaster ID provided.', 400));
    }

    // Ensure numeric fields are converted if present in updates
    if (updates.disaster_type_id !== undefined) updates.disaster_type_id = Number(updates.disaster_type_id);
    // Convert date fields to ISO string if present
    if (updates.disaster_start_date !== undefined) updates.disaster_start_date = new Date(updates.disaster_start_date).toISOString();
    if (updates.disaster_end_date !== undefined) updates.disaster_end_date = updates.disaster_end_date ? new Date(updates.disaster_end_date).toISOString() : null;

    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(updates)
            .eq('id', id)
            .select();

        if (error && error.code === 'PGRST116') {
             logger.warn('Disaster not found for update', { id, code: error.code });
             return next(new ApiError(`Disaster with ID ${id} not found for update.`, 404));
        }
        if (error) {
            if (error.code === '23503') { // PostgreSQL foreign key violation error code
                logger.warn('Foreign key constraint failed during disaster update', { error: error.message, id, updates });
                return next(new ApiError('Foreign key constraint failed (disaster_type_id does not exist).', 400));
            }
            logger.error('Supabase Error (updateDisaster):', { error: error.message, details: error, id });
            return next(new ApiError('Failed to update disaster entry.', 500));
        }

        if (!data || data.length === 0) {
            logger.warn('Disaster not found for update', { id });
            return next(new ApiError(`Disaster with ID ${id} not found for update.`, 404));
        }

        // Invalidate all disaster-related caches since a disaster was updated
        invalidateCacheByPattern(disasterCache, 'disasters:');
        logger.info('Cache invalidated after disaster update', { id });

        logger.debug('Disaster updated successfully', { id });
        logger.debug('Updated disaster data', { data: data[0] });
        
        res.status(200).json({
            message: `Disaster with ID ${id} updated successfully.`,
            data: data[0]
        });
    } catch (err) {
        logger.error('Internal server error during updateDisaster', { error: err.message, stack: err.stack, id });
        next(new ApiError('Internal server error during updateDisaster.', 500));
    }
};

/**
 * @desc Soft delete a disaster entry (sets deleted_at timestamp)
 * @route DELETE /api/v1/disasters/:id
 * @access Private (requires authentication and delete_disaster permission)
 */
exports.deleteDisaster = async (req, res, next) => {
    // Use validated params
    const { id } = req.validatedParams || req.params;

    if (!id || isNaN(Number(id))) {
        logger.warn('Invalid disaster ID provided for deletion', { id });
        return next(new ApiError('Invalid disaster ID provided.', 400));
    }

    try {
        // Soft delete - update deleted_at instead of actually deleting
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null) // Only update if not already deleted
            .select();

        if (error) {
            logger.error('Supabase Error (deleteDisaster):', { error: error.message, details: error, id });
            return next(new ApiError('Failed to delete disaster entry.', 500));
        }

        if (!data || data.length === 0) {
            logger.warn('Disaster not found for deletion or already deleted', { id });
            return next(new ApiError(`Disaster with ID ${id} not found for deletion or already deleted.`, 404));
        }

        // Invalidate all disaster-related caches since a disaster was deleted
        invalidateCacheByPattern(disasterCache, 'disasters:');
        logger.info('Cache invalidated after disaster deletion', { id });

        logger.debug('Disaster soft deleted successfully', { id });
        
        res.status(200).json({
            message: `Disaster with ID ${id} deleted successfully.`
        });
    } catch (err) {
        logger.error('Internal server error during deleteDisaster', { error: err.message, stack: err.stack, id });
        next(new ApiError('Internal server error during deleteDisaster.', 500));
    }
};

exports.getAllDisasterTypes = async (req, res, next) => {
    try {
        // Generate cache key for disaster types
        const cacheKey = generateCacheKey('disaster_types:all');
        
        // Check cache first
        const cachedData = disasterCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for getAllDisasterTypes', { cacheKey, count: cachedData.length });
            return res.status(200).json({
                message: 'Successfully retrieved all disaster type entries.',
                count: cachedData.length,
                data: cachedData,
                cached: true
            });
        }
        
        logger.debug('Cache miss for getAllDisasterTypes', { cacheKey });
        
        const { data, error } = await supabase
            .from('disaster_types')
            .select('*'); // Select all columns from the Disasters_Types table

        if (error) {
            logger.error('Supabase Error (getAllDisasterTypes):', { error: error.message, details: error });
            return next(new ApiError('Failed to retrieve disaster type entries.', 500));
        }

        if (!data || data.length === 0) {
            logger.debug('No disaster type entries found');
            return res.status(200).json({ message: 'No disaster type entries found.', data: [] });
        }

        // Store in cache
        disasterCache.set(cacheKey, data);
        logger.debug('Data cached for getAllDisasterTypes', { cacheKey, count: data.length });

        logger.debug('Successfully retrieved all disaster type entries', { count: data.length });
        logger.debug('Disaster types data', { data });
        
        res.status(200).json({
            message: 'Successfully retrieved all disaster type entries.',
            count: data.length,
            data: data
        });
    } catch (err) {
        logger.error('Internal server error during getAllDisasterTypes', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during getAllDisasterTypes.', 500));
    }
};