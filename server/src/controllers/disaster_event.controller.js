// disaster_event.controller.js

const { supabase } = require('../config/supabase'); // Import the centralized Supabase client
const logger = require('../utils/logger');
const { createCache, generateCacheKey, invalidateCacheByPattern } = require('../utils/cache');
// const { logAudit } = require('../utils/auditLogger'); // REMOVED: Import logAudit for auditing

const TABLE_NAME = 'disaster_evacuation_event'; // Main table for this controller
const TABLE_NAME_SUMMARY = 'evacuation_summaries'; // New table for summaries

// Initialize LRU cache with 5-minute TTL
const disasterEventCache = createCache({
    max: 1000, // Maximum 1000 items in cache (more than disasters due to pagination)
    ttl: 1000 * 60 * 5, // 5 minutes TTL
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
 * @desc Get detailed disaster evacuation event data filtered by disaster ID,
 * including summary counts, evacuation center details, and assigned user's name.
 * @route GET /api/v1/disaster-events/by-disaster/:disasterId/details
 * @access Public (for now, apply auth middleware later if needed)
 */
exports.getDisasterEventDetailsByDisasterId = async (req, res, next) => {
    const { disasterId } = req.params;
    const { page = 1, limit = 10, search, ec_type, barangay_id } = req.query;

    if (!disasterId || isNaN(Number(disasterId))) {
        return next(new ApiError('Invalid Disaster ID provided.', 400));
    }

    // Validate barangay_id if provided
    if (barangay_id && isNaN(Number(barangay_id))) {
        return next(new ApiError('Invalid Barangay ID provided.', 400));
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return next(new ApiError('Invalid pagination parameters. Page must be >= 1, limit must be 1-100.', 400));
    }

    const offset = (pageNum - 1) * limitNum;

    try {
        // Generate cache key based on all query parameters
        const cacheKey = generateCacheKey('disaster_events:by_disaster', {
            disasterId,
            page: pageNum,
            limit: limitNum,
            search,
            ec_type,
            barangay_id
        });

        // Check cache first
        const cachedData = disasterEventCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for getDisasterEventDetailsByDisasterId', { 
                cacheKey, 
                disasterId,
                recordCount: cachedData.data.length 
            });
            return res.status(200).json({
                ...cachedData,
                cached: true
            });
        }

        logger.debug('Cache miss for getDisasterEventDetailsByDisasterId', { cacheKey, disasterId });

        // Build the base query for counting with EC type filter
        let countQuery = supabase
            .from(TABLE_NAME)
            .select('*, evacuation_centers!inner(category, barangay_id)', { count: 'exact', head: true })
            .eq('disaster_id', disasterId);
            
        // Add EC type filter if provided
        if (ec_type === 'inside') {
            countQuery = countQuery.in('evacuation_centers.category', ['School', 'Chapel/Church', 'Dedicated Evacuation Center', 'Government Building', 'Commercial Building']);
        } else if (ec_type === 'outside') {
            countQuery = countQuery.in('evacuation_centers.category', ['Private House']);
        }

        // Add barangay filter if provided
        if (barangay_id) {
            countQuery = countQuery.eq('evacuation_centers.barangay_id', barangay_id);
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
            logger.error('Supabase Error (count query):', { error: countError });
            return next(new ApiError('Failed to retrieve disaster event count.', 500));
        }

        // Ensure count is a number
        let totalCount = count || 0;

        // Build the main data query
        let dataQuery = supabase
            .from(TABLE_NAME) // Disaster_Evacuation_Event
            .select(`
                *,
                evacuation_summaries(
                    total_no_of_family,
                    total_no_of_individuals
                ),
                evacuation_centers!inner(
                    name,
                    total_capacity,
                    category,
                    barangay_id,
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
            
        // Add EC type filter if provided
        if (ec_type === 'inside') {
            dataQuery = dataQuery.in('evacuation_centers.category', ['School', 'Chapel/Church', 'Dedicated Evacuation Center', 'Government Building']);
        } else if (ec_type === 'outside') {
            dataQuery = dataQuery.in('evacuation_centers.category', ['Commercial Building', 'Private House']);
        }

        // Add barangay filter if provided
        if (barangay_id) {
            dataQuery = dataQuery.eq('evacuation_centers.barangay_id', barangay_id);
        }

        // Apply search filter if provided
        // For now, we'll implement a simpler search that works with the current Supabase setup
        if (search && search.trim()) {
            const searchTerm = search.trim().toLowerCase();

            // Get all data first, then filter in application code
            // This is not ideal for performance but works with the current schema
            const { data: allData, error: allDataError } = await dataQuery;

            if (allDataError) {
                logger.error('Supabase Error (data query):', { error: allDataError });
                return next(new ApiError('Failed to retrieve disaster event data.', 500));
            }

            if (!allData || allData.length === 0) {
                return res.status(200).json({
                    message: `No disaster evacuation events found for Disaster ID ${disasterId}.`,
                    data: [],
                    pagination: {
                        current_page: pageNum,
                        per_page: limitNum,
                        total_pages: Math.ceil(totalCount / limitNum),
                        total_records: totalCount,
                        has_next_page: pageNum < Math.ceil(totalCount / limitNum),
                        has_prev_page: pageNum > 1
                    }
                });
            }

            // Filter data based on search term
            const filteredData = allData.filter(event => {
                const centerName = event.evacuation_centers?.name?.toLowerCase() || '';
                const barangayName = event.evacuation_centers?.barangays?.name?.toLowerCase() || '';
                return centerName.includes(searchTerm) || barangayName.includes(searchTerm);
            });

            // Update total count for pagination based on filtered results
            const filteredTotalCount = filteredData.length;
            const filteredTotalPages = Math.ceil(filteredTotalCount / limitNum);

            // Apply pagination to filtered results
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedData = filteredData.slice(startIndex, endIndex);

            // Transform and return filtered data
            const transformedData = paginatedData.map(event => {
                try {
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

                    // Destructure to omit the original nested objects
                    const { evacuation_summaries, evacuation_centers, users, ...rest } = event;

                    return {
                        ...rest,
                        total_no_of_family: totalNoOfFamily,
                        total_no_of_individuals: totalNoOfIndividuals,
                        evacuation_center_name: evacuationCenterName,
                        evacuation_center_total_capacity: evacuationCenterTotalCapacity,
                        evacuation_center_barangay_name: evacuationCenterBarangayName,
                        assigned_user_name: assignedUserName
                    };
                } catch (transformError) {
                    logger.error('Error transforming event data:', { error: transformError, event });
                    return null;
                }
            }).filter(item => item !== null);

            logger.debug('Successfully retrieved filtered disaster evacuation events', { 
                disasterId, 
                searchTerm,
                totalRecords: filteredTotalCount, 
                page: pageNum,
                limit: limitNum 
            });

            const responseData = {
                message: `Successfully retrieved detailed disaster evacuation events for Disaster ID ${disasterId}.`,
                data: transformedData,
                pagination: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total_pages: filteredTotalPages,
                    total_records: filteredTotalCount,
                    has_next_page: pageNum < filteredTotalPages,
                    has_prev_page: pageNum > 1
                }
            };

            // Store in cache
            disasterEventCache.set(cacheKey, responseData);
            logger.debug('Data cached for getDisasterEventDetailsByDisasterId (filtered)', { cacheKey });

            return res.status(200).json(responseData);
        }

        const { data, error } = await dataQuery
            .range(offset, offset + limitNum - 1); // Apply pagination

        if (error) {
            logger.error('Supabase Error (getDisasterEventDetailsByDisasterId):', { error });
            return next(new ApiError('Failed to retrieve detailed disaster event data.', 500));
        }

        if (!data || data.length === 0) {
            const totalPages = Math.ceil(totalCount / limitNum);
            return res.status(200).json({
                message: `No disaster evacuation events found for Disaster ID ${disasterId}.`,
                data: [],
                pagination: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total_pages: totalPages,
                    total_records: totalCount,
                    has_next_page: pageNum < totalPages,
                    has_prev_page: pageNum > 1
                }
            });
        }

        // Transform the data to flatten the nested objects and combine names
        const transformedData = data.map(event => {
            try {
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
            } catch (transformError) {
                logger.error('Error transforming event data:', { error: transformError, event });
                return null;
            }
        }).filter(item => item !== null); // Remove any null items from failed transformations

        const totalPages = Math.ceil(totalCount / limitNum);

        const responseData = {
            message: `Successfully retrieved detailed disaster evacuation events for Disaster ID ${disasterId}.`,
            data: transformedData,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_pages: totalPages,
                total_records: totalCount,
                has_next_page: pageNum < totalPages,
                has_prev_page: pageNum > 1
            }
        };

        // Store in cache
        disasterEventCache.set(cacheKey, responseData);
        logger.debug('Data cached for getDisasterEventDetailsByDisasterId', { cacheKey, count: transformedData.length });

        res.status(200).json(responseData);
    } catch (err) {
        logger.error('Unexpected error in getDisasterEventDetailsByDisasterId:', { error: err });
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
        // Generate cache key for this specific disaster event
        const cacheKey = generateCacheKey('disaster_events:id', id);
        
        // Check cache first
        const cachedData = disasterEventCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for getDisasterEventById', { cacheKey, id });
            logger.info('Serving getDisasterEventById from cache', { cacheKey, id });
            return res.status(200).json({
                ...cachedData,
                cached: true
            });
        }
        
        logger.debug('Cache miss for getDisasterEventById', { cacheKey, id });

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
            // If no row found with .single(), Supabase returns a specific error
            if (error.code === 'PGRST116') { // Supabase error code for no rows found with .single()
                logger.warn('Disaster event not found:', { id, error });
                return res.status(404).json({
                    message: `Disaster evacuation event with ID ${id} not found.`,
                    data: null
                });
            }
            logger.error('Supabase Error (getDisasterEventById):', { error });
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

        const responseData = {
            message: `Successfully retrieved detailed disaster evacuation event with ID ${id}.`,
            data: transformedData
        };

        // Store in cache
        disasterEventCache.set(cacheKey, responseData);
        logger.debug('Data cached for getDisasterEventById', { cacheKey, id });

        res.status(200).json(responseData);
    } catch (err) {
        next(new ApiError('Internal server error during getDisasterEventById.', 500));
    }
};


/**
 * @desc Check if a disaster event exists for a specific evacuation center and disaster combination
 * @route GET /api/v1/disaster-events/check/:disasterId/:evacuationCenterId
 * @access Private (requires view_disaster permission)
 */
exports.checkDisasterEventByEvacuationCenter = async (req, res, next) => {
    const { disasterId, evacuationCenterId } = req.params;

    if (!disasterId || isNaN(Number(disasterId))) {
        return next(new ApiError('Invalid Disaster ID provided.', 400));
    }

    if (!evacuationCenterId || isNaN(Number(evacuationCenterId))) {
        return next(new ApiError('Invalid Evacuation Center ID provided.', 400));
    }

    try {
        // Generate cache key
        const cacheKey = generateCacheKey('disaster_events:check', { disasterId, evacuationCenterId });
        
        // Check cache first
        const cachedData = disasterEventCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for checkDisasterEventByEvacuationCenter', { 
                cacheKey, 
                disasterId, 
                evacuationCenterId 
            });
            return res.status(200).json({
                ...cachedData,
                cached: true
            });
        }
        
        logger.debug('Cache miss for checkDisasterEventByEvacuationCenter', { 
            cacheKey, 
            disasterId, 
            evacuationCenterId 
        });

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, disaster_id, evacuation_center_id')
            .eq('disaster_id', disasterId)
            .eq('evacuation_center_id', evacuationCenterId)
            .maybeSingle(); // Use maybeSingle to avoid error if no row found

        if (error) {
            logger.error('Supabase Error (checkDisasterEventByEvacuationCenter):', { error });
            return next(new ApiError('Failed to check disaster event.', 500));
        }

        let responseData;
        if (data) {
            // Disaster event exists
            logger.debug('Disaster event found for evacuation center', { 
                disasterId, 
                evacuationCenterId, 
                eventId: data.id 
            });
            responseData = {
                message: 'Disaster event found.',
                exists: true,
                data: {
                    id: data.id,
                    disaster_id: data.disaster_id,
                    evacuation_center_id: data.evacuation_center_id
                }
            };
        } else {
            // No disaster event found
            logger.debug('No disaster event found for evacuation center', { 
                disasterId, 
                evacuationCenterId 
            });
            responseData = {
                message: 'No disaster event found for this evacuation center and disaster combination.',
                exists: false,
                data: null
            };
        }

        // Store in cache
        disasterEventCache.set(cacheKey, responseData);
        logger.debug('Data cached for checkDisasterEventByEvacuationCenter', { cacheKey });

        res.status(200).json(responseData);
    } catch (err) {
        logger.error('Unexpected error in checkDisasterEventByEvacuationCenter:', { error: err });
        next(new ApiError('Internal server error during checkDisasterEventByEvacuationCenter.', 500));
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
            if (error.code === '23503') {
                logger.warn('Foreign key constraint failed in createDisasterEvent:', { 
                    error: {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    }
                });
                return next(new ApiError('Foreign key constraint failed (e.g., disaster_id, assigned_user_id, or evacuation_center_id does not exist).', 400));
            }
            logger.error('Supabase Error (createDisasterEvent - Event Insert):', {
                error: {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                }
            });
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
            logger.error('Supabase Error (createDisasterEvent - Summary Insert):', {
                error: {
                    message: summaryError.message,
                    details: summaryError.details,
                    hint: summaryError.hint,
                    code: summaryError.code
                }
            });
            // Decide how to handle this. You might want to delete the just-created event
            // to maintain data consistency, or just log and proceed. For now, we'll
            // return an error indicating the overall operation failed.
            return next(new ApiError('Failed to create corresponding evacuation summary entry.', 500));
        }

        // Invalidate all disaster event related caches since a new event was created
        invalidateCacheByPattern(disasterEventCache, 'disaster_events:');
        logger.info('Cache invalidated after disaster event creation', { 
            eventId: disasterEvacuationEventId,
            disasterId: disaster_id 
        });

        logger.debug('Disaster evacuation event created successfully', { 
            eventId: disasterEvacuationEventId,
            disasterId: disaster_id,
            evacuationCenterId: evacuation_center_id 
        });

        res.status(201).json({
            message: 'Disaster evacuation event and associated summary entry created successfully.',
            data: createdEvent // Return the created event data
        });
    } catch (err) {
        logger.error('Unexpected error in createDisasterEvent:', { error: err });
        next(new ApiError('Internal server error during createDisasterEvent.', 500));
    }
};