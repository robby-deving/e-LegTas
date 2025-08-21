// server/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

router.post('/generate', reportsController.generateReport);

module.exports = router;
