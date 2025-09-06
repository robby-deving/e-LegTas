// server/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { requirePermission } = require('../middleware');

router.post(
  '/generate',
  requirePermission('create_report'),
  reportsController.generateReport
);
router.get(
  '/getAllReports',
  requirePermission('view_reports'),
  reportsController.getAllReports
);
router.delete(
  '/:id',
  requirePermission('delete_report'),
  reportsController.deleteReport
);
router.get(
  '/types',
  requirePermission('view_reports'),
  reportsController.getReportTypes
);
router.get(
  '/options',
  requirePermission('view_reports'),
  reportsController.getReportOptions
);

module.exports = router;
