// server/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

router.post('/generate', reportsController.generateReport);
router.get('/getAllReports', reportsController.getAllReports);
router.delete('/:id', reportsController.deleteReport);
router.get('/types', reportsController.getReportTypes);
router.get('/options', reportsController.getReportOptions);

module.exports = router;
