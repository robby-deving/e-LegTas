const express = require('express');
const { 
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions
} = require('../controllers/permission.controller');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all permission routes
router.use(authenticateUser);

// Permission routes
router.get('/', getPermissions);                    // GET /api/v1/permissions
router.get('/role/:roleId', getRolePermissions);    // GET /api/v1/permissions/role/:roleId
router.put('/role/:roleId', updateRolePermissions); // PUT /api/v1/permissions/role/:roleId
router.get('/user/:userId', getUserPermissions);    // GET /api/v1/permissions/user/:userId

module.exports = router;
