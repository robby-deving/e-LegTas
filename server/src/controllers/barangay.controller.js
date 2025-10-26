const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const { createCache, generateCacheKey, invalidateCacheByPattern } = require('../utils/cache');

class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Initialize LRU cache with 5-minute TTL
const barangayCache = createCache({
    max: 500,              // Max 500 items in cache
    ttl: 1000 * 60 * 5,   // 5 minutes TTL
});

/**
 * @desc Get list of all barangays
 * @route GET /api/v1/barangays
 * @access Public
 */
exports.getBarangays = async (req, res, next) => {
    try {
        // Generate cache key for barangays
        const cacheKey = generateCacheKey('barangays:all');
        
        // Check cache first
        const cachedData = barangayCache.get(cacheKey);
        if (cachedData) {
            logger.debug('Cache hit for getBarangays', { cacheKey, count: cachedData.data.length });
            return res.status(200).json({
                ...cachedData,
                cached: true
            });
        }
        
        logger.debug('Cache miss for getBarangays', { cacheKey });

        const { data, error } = await supabase
            .from('barangays')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            logger.error('Supabase Error (getBarangays):', error);
            return next(new ApiError('Failed to retrieve barangays.', 500));
        }
        
        const responseData = {
            message: 'Successfully retrieved barangays.',
            count: data.length,
            data: data
        };

        // Store in cache
        barangayCache.set(cacheKey, responseData);
        logger.debug('Data cached for getBarangays', { cacheKey, count: data.length });

        res.status(200).json(responseData);
    } catch (err) {
        logger.error('Error in getBarangays:', err);
        next(new ApiError('Internal server error during getBarangays.', 500));
    }
}; 