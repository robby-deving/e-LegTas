// evacuation.search.controller.js

const { supabase } = require('../config/supabase');

class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

/**
 * @desc Search evacuation centers (private houses) and check their status for a specific disaster
 * @route GET /api/v1/evacuation-centers/search
 * @access Public
 */
exports.searchEvacuations = async (req, res, next) => {
    const { disasterId, search } = req.query;

    if (!disasterId || isNaN(Number(disasterId))) {
        return next(new ApiError('Invalid Disaster ID provided.', 400));
    }

    try {
        // Build query to get evacuation centers (private houses) with their disaster events
        let query = supabase
            .from('evacuation_centers')
            .select(`
                *,
                disaster_evacuation_event!left (
                    id,
                    evacuation_start_date,
                    evacuation_end_date,
                    disaster_id
                ),
                barangays (
                    name
                )
            `)
            .eq('category', 'Private House')
            .order('name', { ascending: true })
            .limit(10); // Always limit to top 10 results

        // Apply search filter if provided
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query = query.or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`);
        }

        // Execute query
        const { data, error } = await query;

        if (error) {
            console.error('Error fetching evacuation centers:', error);
            return next(new ApiError('Failed to search evacuation centers.', 500));
        }

        // Transform the data to include status
        const transformedData = data.map(center => {
            // Find active event for this center and disaster
            const activeEvent = center.disaster_evacuation_event?.find(event => 
                event.disaster_id === Number(disasterId)
            );

            let status = 'Inactive';
            if (activeEvent) {
                if (!activeEvent.evacuation_end_date) {
                    status = 'Active';
                } else {
                    const endDate = new Date(activeEvent.evacuation_end_date);
                    if (endDate > new Date()) {
                        status = 'Active';
                    } else {
                        status = 'Ended';
                    }
                }
            }

            // Clean up the response object
            const { disaster_evacuation_event, ...centerData } = center;
            
            return {
                ...centerData,
                barangay_name: center.barangays?.name || 'Unknown',
                status,
                event_id: activeEvent?.id || null
            };
        });

        res.status(200).json({
            message: 'Successfully retrieved evacuation centers.',
            data: transformedData
        });

    } catch (err) {
        console.error('Unexpected error in searchEvacuations:', err);
        next(new ApiError('Internal server error during evacuation search.', 500));
    }
};
