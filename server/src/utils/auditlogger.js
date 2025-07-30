// src/utils/auditLogger.js

const supabase = require('../config/supabase'); // Import the centralized Supabase client

const AUDIT_LOGS_TABLE = 'audit_logs'; // Define the Audit Logs table name

/**
 * Logs an audit event to the audit_logs table.
 * @param {string} actionType - The type of action (e.g., 'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE').
 * @param {string} tableName - The name of the table affected.
 * @param {number} userId - The ID of the user performing the action.
 * @param {object} [oldValue=null] - The state of the record before the action (for updates/deletes).
 * @param {object} [newValue=null] - The state of the record after the action (for creates/updates).
 */
const logAudit = async (actionType, tableName, userId, oldValue = null, newValue = null) => {
    try {
        // Ensure userId is a number, default to 0 if not provided or invalid
        const effectiveUserId = typeof userId === 'number' && !isNaN(userId) ? userId : 0;

        const logEntry = {
            user_id: effectiveUserId,
            action_type: actionType,
            table_name: tableName,
            log_timestamp: new Date().toISOString(),
            old_value: oldValue ? JSON.stringify(oldValue) : null, // Convert object to JSON string
            new_value: newValue ? JSON.stringify(newValue) : null  // Convert object to JSON string
        };

        const { error } = await supabase
            .from(AUDIT_LOGS_TABLE)
            .insert([logEntry]);

        if (error) {
            console.error('Supabase Audit Log Error:', error);
            // In a production system, you might want to send this error to an external logging service
            // rather than just console.error, as audit log failures are critical.
        }
    } catch (err) {
        console.error('Unexpected error while logging audit:', err);
        // Catch any unexpected errors during the logging process itself
    }
};

module.exports = {
    logAudit
};
