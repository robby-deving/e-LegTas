const express = require('express');

// Import route modules
const evacuationCentersRoutes = require('./evacuationCenters.routes');
const roomRoutes = require('./room.routes');
const disasterRoutes = require('./disaster.routes');
const disasterEventRoutes = require('./disaster_event.route');
const evacueesRoutes = require('./evacuees.routes');
const barangayRoutes = require('./barangay.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const permissionRoutes = require('./permission.routes');
const roleRoutes = require('./role.routes');
const notificationRoutes = require('./notification.routes');
const dashboardRoutes = require('./dashboard.routes');
const profileRoutes = require('./profile.routes');
const mobileRoutes = require('./mobile.routes');

const reportsRoutes = require('./reports.routes');
// Middleware and controllers
const { authenticateUser, requirePermission } = require('../middleware');
const { createRole, deleteRole, getUserCountsByRole } = require('../controllers/user.controller');
const { 
  authRateLimit, 
  passwordResetRateLimit, 
  apiRateLimit, 
  uploadRateLimit, 
  reportRateLimit, 
  searchRateLimit, 
  dashboardRateLimit 
} = require('../middleware/rateLimiting');

const router = express.Router();
const baseAPI = '/api/v1';

// Endpoint: User counts by role
router.get(
  '/users/role-counts',
  authenticateUser,
  requirePermission('view_user_management'),
  getUserCountsByRole
);

// Mount routes with appropriate rate limiting
router.use('/auth', authRateLimit, authRoutes);
// Apply auth to all /users routes so permission middleware has req.user
router.use('/users', apiRateLimit, authenticateUser, userRoutes);
router.use('/permissions', apiRateLimit, permissionRoutes);
router.use('/roles', apiRateLimit, roleRoutes);
// Protect all notifications endpoints so permission checks have req.user
router.use('/notifications', apiRateLimit, authenticateUser, notificationRoutes);
router.use('/evacuation-centers', apiRateLimit, evacuationCentersRoutes);
router.use('/disasters', apiRateLimit, disasterRoutes);
router.use('/rooms', apiRateLimit, roomRoutes);
router.use('/disaster-events', apiRateLimit, disasterEventRoutes);
router.use('/dashboard', dashboardRateLimit, dashboardRoutes);
router.use('/evacuees', apiRateLimit, evacueesRoutes);
router.use('/barangays', apiRateLimit, barangayRoutes);

router.use('/profile', apiRateLimit, profileRoutes);

router.use('/reports', reportRateLimit, reportsRoutes);

// Role creation route
router.post(
  '/roles',
  authenticateUser,
  requirePermission('create_role'),
  createRole
);

// Role routes are handled in role.routes.js

// Health check
router.get('/health', (req, res) => {
  res.json({
    message: 'Server is running',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

// IP address information endpoint (for debugging and testing)
router.get('/ip-info', (req, res) => {
  res.json({
    clientIP: req.clientIP,
    ipInfo: req.ipInfo,
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, baseAPI };