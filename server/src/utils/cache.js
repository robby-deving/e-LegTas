// cache.js - LRU Cache utility with TTL support

const { LRUCache } = require('lru-cache');
const logger = require('./logger');

/**
 * Create an LRU cache instance with configurable options
 * @param {Object} options - Cache configuration options
 * @param {number} options.max - Maximum number of items in cache (default: 500)
 * @param {number} options.ttl - Time to live in milliseconds (default: 1 hour)
 * @returns {LRUCache} Configured LRU cache instance
 */
function createCache(options = {}) {
    const defaultOptions = {
        max: options.max || 500, // Maximum number of items in cache
        ttl: options.ttl || 1000 * 60 * 60, // 1 hour in milliseconds
        updateAgeOnGet: false, // Don't reset TTL on get
        updateAgeOnHas: false, // Don't reset TTL on has
        allowStale: false, // Don't return stale items
    };

    const cache = new LRUCache(defaultOptions);
    
    logger.info('Cache instance created', { 
        max: defaultOptions.max, 
        ttl: `${defaultOptions.ttl / 1000 / 60} minutes` 
    });

    return cache;
}

/**
 * Generate a cache key from an object or string
 * @param {string} prefix - Key prefix (e.g., 'disaster', 'disaster_type')
 * @param {Object|string|number} params - Parameters to include in the key
 * @returns {string} Generated cache key
 */
function generateCacheKey(prefix, params = {}) {
    if (typeof params === 'string' || typeof params === 'number') {
        return `${prefix}:${params}`;
    }
    
    if (typeof params === 'object' && params !== null) {
        const sortedParams = Object.keys(params)
            .sort()
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        return sortedParams ? `${prefix}:${sortedParams}` : prefix;
    }
    
    return prefix;
}

/**
 * Invalidate cache entries by pattern
 * @param {LRUCache} cache - Cache instance
 * @param {string} pattern - Pattern to match keys (e.g., 'disaster:')
 */
function invalidateCacheByPattern(cache, pattern) {
    let invalidatedCount = 0;
    const keysToDelete = [];

    // Collect keys that match the pattern
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            keysToDelete.push(key);
        }
    }

    // Delete all matching keys
    keysToDelete.forEach(key => {
        cache.delete(key);
        invalidatedCount++;
    });

    if (invalidatedCount > 0) {
        logger.debug('Cache invalidated by pattern', { pattern, count: invalidatedCount });
    }

    return invalidatedCount;
}

/**
 * Get cache statistics
 * @param {LRUCache} cache - Cache instance
 * @returns {Object} Cache statistics
 */
function getCacheStats(cache) {
    return {
        size: cache.size,
        max: cache.max,
        calculatedSize: cache.calculatedSize,
    };
}

module.exports = {
    createCache,
    generateCacheKey,
    invalidateCacheByPattern,
    getCacheStats
};
