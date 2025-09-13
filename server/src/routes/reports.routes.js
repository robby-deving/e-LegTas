// server/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { requirePermission } = require('../middleware');

// Define routes for report generation and management
router.post( '/generate', requirePermission('create_report'), reportsController.generateReport );

// Route to get all reports
router.get( '/getAllReports', requirePermission('view_reports'), reportsController.getAllReports );

// Route to delete a report by ID
router.delete( '/:id', requirePermission('delete_report'), reportsController.deleteReport );

// Routes to get report types and options
router.get( '/types', requirePermission('view_reports'), reportsController.getReportTypes );

// Route to get report options based on type
router.get( '/options', requirePermission('view_reports'), reportsController.getReportOptions );

module.exports = router;
