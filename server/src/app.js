// app.js

// Import necessary modules
const express = require('express');
const cors = require('cors'); // For handling Cross-Origin Resource Sharing
const apiRouter = require('./routes/router'); // Import your main API router from the 'routes' directory

// Initialize the Express application
const app = express();

// --- Middleware Setup ---

// Enable CORS for all origins (for development purposes).
// In production, you should restrict this to your frontend's domain(s).
app.use(cors());

// Parse incoming JSON requests. This is crucial for POST and PUT requests.
app.use(express.json());

// --- Route Definitions ---

// Mount the main API router under the root path '/'.
// This means your API endpoints will start directly with the version, e.g., /v1/maps, /v1/users.
// If you prefer an '/api' prefix, change this to app.use('/api', apiRouter);
app.use('/', apiRouter);

// --- Basic Route for Health Check (for the root of the app) ---
// This route is for checking the application server itself, not necessarily the API.
// It's good practice to have a simple endpoint to confirm the server is responsive.
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Application server is running!' });
});

// --- Global Error Handling Middleware ---
// This middleware catches any errors thrown by your route handlers.
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack); // Log the error stack for debugging
    res.status(err.statusCode || 500).json({
        message: err.message || 'An unexpected error occurred.',
        error: process.env.NODE_ENV === 'production' ? {} : err // Don't expose detailed errors in production
    });
});

// Export the app instance for server.js to import and for testing
module.exports = app;
