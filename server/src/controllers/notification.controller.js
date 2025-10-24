// Import the centralized Supabase client
const { supabase } = require('../config/supabase');
const admin = require('../config/firebase-admin'); // Assume you have a centralized Firebase Admin setup
const logger = require('../utils/logger');

// Define the table names
const DEVICE_TOKENS_TABLE = 'device_tokens';
const ANNOUNCEMENTS_TABLE = 'announcements';

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
 * @desc Get all announcement entries with pagination
 * @route GET /api/v1/notifications/announcements
 * @access Public
 * @queryParam {number} limit - The number of announcements to return (default: 10)
 * @queryParam {number} offset - The number of announcements to skip (default: 0)
 */
exports.getAllAnnouncements = async (req, res, next) => {
    try {
        const { limit = 10, offset = 0, search } = req.query;

        let query = supabase
            .from(ANNOUNCEMENTS_TABLE)
            .select('*', { count: 'exact' })
            .order('date_posted', { ascending: false });

        // Apply search filter if provided
        if (search && search.trim()) {
            const searchTerm = search.trim();
            query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        }

        // Apply pagination
        const { data, error, count } = await query
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            logger.error('Supabase Error (getAllAnnouncements):', { error: error.message, details: error });
            return next(new ApiError('Failed to retrieve announcements.', 500));
        }

        if (!data || data.length === 0) {
            return res.status(200).json({
                message: 'No announcements found.',
                data: [],
                count: 0,
                totalCount: count || 0
            });
        }

        res.status(200).json({
            message: 'Successfully retrieved announcements.',
            count: data.length,
            totalCount: count || 0,
            data: data
        });
    } catch (err) {
        logger.error('Error in getAllAnnouncements:', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during getAllAnnouncements.', 500));
    }
};

/**
 * @desc Register a new device token for push notifications
 * @route POST /api/v1/notifications/register-token
 * @access Public
 */
exports.registerDeviceToken = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return next(new ApiError('Device token is required.', 400));
        }

        // Check if the token already exists to avoid duplicates
        const { data: existingToken, error: selectError } = await supabase
            .from(DEVICE_TOKENS_TABLE)
            .select('token')
            .eq('token', token)
            .maybeSingle(); // Use maybeSingle to get null if no row is found

        if (selectError) {
            logger.error('Supabase Error (registerDeviceToken - select):', { error: selectError.message, details: selectError });
            return next(new ApiError('Failed to check for existing token.', 500));
        }

        if (existingToken) {
            // Token already exists, so no action is needed
            return res.status(200).json({
                message: 'Token already registered.',
            });
        }

        // If the token does not exist, insert it
        const { error: insertError } = await supabase
            .from(DEVICE_TOKENS_TABLE)
            .insert({ token: token });

        if (insertError) {
            logger.error('Supabase Error (registerDeviceToken - insert):', { error: insertError.message, details: insertError });
            return next(new ApiError('Failed to register device token.', 500));
        }

        res.status(201).json({
            message: 'Device token registered successfully.',
        });
    } catch (err) {
        logger.error('Internal Server Error (registerDeviceToken):', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during device token registration.', 500));
    }
};

/**
 * @desc Create a new announcement and send a push notification to all devices
 * @route POST /api/v1/notifications/send-announcement
 * @access Admin (or authenticated user)
 */
exports.sendAnnouncementNotification = async (req, res, next) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return next(new ApiError('Title and content are required for the announcement.', 400));
        }

        // 1. Save the new announcement to the announcements table
        const { data: newAnnouncement, error: insertError } = await supabase
            .from(ANNOUNCEMENTS_TABLE)
            .insert({
                title,
                content,
                date_posted: new Date().toISOString(), // Use current date for date_posted
                created_by: req.body.created_by // <-- Add this line
            })
            .select(); // Return the newly created row

        if (insertError) {
            logger.error('Supabase Error (sendAnnouncementNotification - insert):', { error: insertError.message, details: insertError });
            return next(new ApiError('Failed to save announcement.', 500));
        }

        // 2. Fetch all device tokens from the database
        const { data: tokens, error: tokensError } = await supabase
            .from(DEVICE_TOKENS_TABLE)
            .select('token');

        if (tokensError) {
            logger.error('Supabase Error (sendAnnouncementNotification - select tokens):', { error: tokensError.message, details: tokensError });
            // We'll still respond with success for saving the announcement, but log the notification error
            logger.warn('Notification send failed due to token retrieval error.');
        }

        // Check if there are any tokens to send to
        if (tokens && tokens.length > 0) {
            const registrationTokens = tokens.map(entry => entry.token);

            const message = {
                notification: {
                    title: title,
                    body: content, // Use content for the notification body
                },
                tokens: registrationTokens,
            };

            // 3. Send the message using Firebase Admin SDK
            const firebaseResponse = await admin.messaging().sendEachForMulticast(message);

            logger.info('Successfully sent notification:', { response: firebaseResponse });
        } else {
            logger.info('No device tokens registered to send a notification.');
        }

        res.status(201).json({
            message: 'Announcement saved and notifications sent successfully (if tokens were found).',
            data: newAnnouncement[0],
        });

    } catch (err) {
        logger.error('Internal Server Error (sendAnnouncementNotification):', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during announcement creation and notification.', 500));
    }
};

/**
 * @desc Delete an announcement by ID
 * @route DELETE /api/v1/notifications/announcements/:id
 * @access Admin (or authenticated user with proper permissions)
 * @param {string} id - The ID of the announcement to delete
 */
exports.deleteAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Ensure the ID is provided
        if (!id) {
            return next(new ApiError('Announcement ID is required.', 400));
        }

        // Attempt to delete the announcement
        const { error } = await supabase
            .from(ANNOUNCEMENTS_TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            // Log the error and pass it to the error handling middleware
            logger.error('Supabase Error (deleteAnnouncement):', { error: error.message, details: error });
            return next(new ApiError('Failed to delete announcement.', 500));
        }

        // Check if a row was actually deleted. Supabase doesn't return count on delete,
        // so a successful delete means the operation completed without an error.
        // You might consider adding a .select() before the delete to check if the
        // item exists, but for a simple delete, this is sufficient.
        res.status(200).json({
            message: `Announcement with ID ${id} deleted successfully.`,
        });

    } catch (err) {
        logger.error('Internal Server Error (deleteAnnouncement):', { error: err.message, stack: err.stack });
        next(new ApiError('Internal server error during announcement deletion.', 500));
    }
};
