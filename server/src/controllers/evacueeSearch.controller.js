// evacueeSearch.controller.js

const supabase = require('../config/supabase');

class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

let evacueeCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @desc Search for evacuees by name with additional fields
 * @route GET /api/v1/evacuees/search
 * @access Public
 */
exports.searchEvacueeByName = async (req, res, next) => {
    const { name } = req.query;
    if (!name || name.trim() === '') {
        return next(new ApiError('Name query is required.', 400));
    }

    try {
        const now = Date.now();
        let evacueeData = [];

        if (evacueeCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL_MS) {
            evacueeData = evacueeCache;
            console.log('[CACHE HIT] Using cached evacuee data.');
        } else {
            console.log('[CACHE MISS] Fetching from Supabase...');
            const { data, error } = await supabase
                .from('evacuation_registrations')
                .select(`
                    id,
                    evacuee_resident_id,
                    disaster_evacuation_event_id,
                    family_head_id,
                    arrival_timestamp,
                    decampment_timestamp,
                    reported_age_at_arrival,
                    ec_rooms_id,
                    evacuee_residents!evacuee_resident_id (
                        id,
                        resident_id,
                        marital_status,
                        educational_attainment,
                        school_of_origin,
                        occupation,
                        purok,
                        relationship_to_family_head,
                        date_registered,
                        residents (
                            id,
                            first_name,
                            middle_name,
                            last_name,
                            suffix,
                            birthdate,
                            sex,
                            barangay_of_origin,
                            barangays (name)
                        ),
                        resident_vulnerabilities (
                            vulnerability_type_id
                        )
                    )
                `);

            if (error) {
                console.error('Supabase error:', error);
                return next(new ApiError('Failed to fetch evacuee records.', 500));
            }

            evacueeData = data;
            evacueeCache = data;
            cacheTimestamp = now;
        }

        const query = name.toLowerCase();

        // Filter evacuees based on the search query
        const filtered = evacueeData.filter(entry => {
            const r = entry.evacuee_residents?.residents;
            if (!r) return false;

            const first = r.first_name?.toLowerCase() || '';
            const middle = r.middle_name?.toLowerCase() || '';
            const last = r.last_name?.toLowerCase() || '';
            const suffix = r.suffix?.toLowerCase() || '';
            const fullName = `${first} ${middle} ${last} ${suffix}`.trim();
            console.log('Constructed Full Name:', fullName);

            // Search by first name, middle name, last name, or full name
            return (
                first.includes(query) ||
                middle.includes(query) ||
                last.includes(query) ||
                suffix.includes(query) ||
                fullName.includes(query)
            );
        });

        // Map over the filtered evacuee data
        const result = filtered.map(entry => {
            const resident = entry.evacuee_residents.residents;
            const evacuee = entry.evacuee_residents;
            const vulnerabilities = evacuee.resident_vulnerabilities?.map(v => v.vulnerability_type_id) || [];

            return {
                evacuee_resident_id: entry.evacuee_resident_id,
                first_name: resident.first_name,
                middle_name: resident.middle_name,
                last_name: resident.last_name,
                suffix: resident.suffix,
                birthdate: resident.birthdate,
                sex: resident.sex,
                barangay_of_origin: resident.barangay_of_origin,
                marital_status: evacuee.marital_status,
                educational_attainment: evacuee.educational_attainment,
                school_of_origin: evacuee.school_of_origin,
                occupation: evacuee.occupation,
                purok: evacuee.purok,
                relationship_to_family_head: evacuee.relationship_to_family_head,
                date_registered: evacuee.date_registered,
                arrival_timestamp: entry.arrival_timestamp,
                decampment_timestamp: entry.decampment_timestamp,
                reported_age_at_arrival: entry.reported_age_at_arrival,
                disaster_evacuation_event_id: entry.disaster_evacuation_event_id,
                ec_rooms_id: entry.ec_rooms_id,
                family_head_id: entry.family_head_id,
                vulnerability_type_ids: vulnerabilities
            };
        });

        return res.status(200).json(result);
    } catch (err) {
        console.error('Evacuee search error:', err);
        return next(new ApiError('Internal server error during evacuee search.', 500));
    }
};