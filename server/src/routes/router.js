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

// Middleware and controllers
const { authenticateUser, requireRoleGroup, requireUserManagementAccess } = require('../middleware');
const { createRole, deleteRole, getUserCountsByRole } = require('../controllers/user.controller');

const router = express.Router();
const baseAPI = '/api/v1';

// Endpoint: User counts by role
router.get(
  '/users/role-counts',
  authenticateUser,
  requireRoleGroup('SYSTEM_ADMIN_GROUP'),
  getUserCountsByRole
);

// Mount routes
router.use('/auth', authRoutes);
// Apply auth to all /users routes so permission middleware has req.user
router.use('/users', authenticateUser, userRoutes);
router.use('/permissions', permissionRoutes);
router.use('/roles', roleRoutes);
// Protect all notifications endpoints so permission checks have req.user
router.use('/notifications', authenticateUser, notificationRoutes);
router.use('/evacuation-centers', evacuationCentersRoutes);
router.use('/disasters', disasterRoutes);
router.use('/rooms', roomRoutes);
router.use('/disaster-events', disasterEventRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/evacuees', evacueesRoutes);
router.use('/barangays', barangayRoutes);
router.use('/notifications', notificationRoutes);
router.use('/profile', profileRoutes);


// Role routes are handled in role.routes.js

// Health check
router.get('/health', (req, res) => {
  res.json({
    message: 'Server is running',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, baseAPI };