// router.js

const express = require('express');
const router = express.Router();

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
const notificationRoutes = require('./notification.routes'); const dashboardRoutes = require('./dashboard.routes'); 
const { createRole, deleteRole } = require('../controllers/user.controller');
const { authenticateUser, requireRoleGroup, requireUserManagementAccess } = require('../middleware');

// Base API path
const baseAPI = '/api/v1';

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/permissions', permissionRoutes);
router.use('/evacuation-centers', evacuationCentersRoutes);
router.use('/disasters', disasterRoutes);
router.use('/rooms', roomRoutes);
router.use('/disaster-events', disasterEventRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/evacuees', evacueesRoutes);
router.use('/barangays', barangayRoutes);
router.use('/notifications', notificationRoutes);

// Role creation route (POST /api/v1/roles)
router.post('/roles',
  authenticateUser,
  requireRoleGroup('SYSTEM_ADMIN_GROUP'),
  requireUserManagementAccess('add'),
  createRole
);

// Role deletion route (DELETE /api/v1/roles/:id)
router.delete('/roles/:id',
  authenticateUser,
  requireRoleGroup('SYSTEM_ADMIN_GROUP'),
  requireUserManagementAccess('delete'),
  deleteRole
);

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, baseAPI }; 