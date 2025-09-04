const express = require('express');
const { 
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions
} = require('../controllers/permission.controller');
const { authenticateUser, requirePermission } = require('../middleware');

const router = express.Router();

// Apply authentication middleware to all permission routes
router.use(authenticateUser);

// Permission routes
router.get('/', getPermissions);                    // GET /api/v1/permissions
router.get('/role/:roleId', getRolePermissions);    // GET /api/v1/permissions/role/:roleId
// Editing role permissions requires edit_user_permission
router.put('/role/:roleId', requirePermission('edit_user_permission'), updateRolePermissions);
router.get('/user/:userId', getUserPermissions);    // GET /api/v1/permissions/user/:userId

module.exports = router;
