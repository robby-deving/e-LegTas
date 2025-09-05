// server/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticateUser, requirePermission } = require('../middleware');

router.post(
  '/generate',
  authenticateUser,
  requirePermission('create_report'),
  reportsController.generateReport
);
router.get(
  '/getAllReports',
  authenticateUser,
  requirePermission('view_reports'),
  reportsController.getAllReports
);
router.delete(
  '/:id',
  authenticateUser,
  requirePermission('delete_report'),
  reportsController.deleteReport
);
router.get(
  '/types',
  authenticateUser,
  requirePermission('view_reports'),
  reportsController.getReportTypes
);
router.get(
  '/options',
  authenticateUser,
  requirePermission('view_reports'),
  reportsController.getReportOptions
);

module.exports = router;
