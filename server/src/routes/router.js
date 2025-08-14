const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const permissionRoutes = require('./permission.routes');

const { authenticateUser, requireRoleGroup, requireUserManagementAccess } = require('../middleware');
const router = express.Router();
const { createRole, deleteRole, getUserCountsByRole } = require('../controllers/user.controller');

// User counts by role (GET /api/v1/users/role-counts)
router.get('/users/role-counts',
  authenticateUser,
  requireRoleGroup('SYSTEM_ADMIN_GROUP'),
  getUserCountsByRole
);
const baseAPI = '/api/v1';

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/permissions', permissionRoutes);

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
