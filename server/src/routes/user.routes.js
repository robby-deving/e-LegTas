const express = require('express');
const { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser,
  deleteUser,
  getUsersByRole,
  getUsersWithRoleFourAndFive,
  getRoles,
  createRole,
  getEvacuationCenters, 
  getBarangays,
  getDisasters,
  getEnumValues,
  checkUserCanLogin,
  getUserStats,
  getRecentUsers
} = require('../controllers/user.controller');

// Import middleware
const { 
  authenticateUser,
  filterUsersByRole,
  requireRoleGroup,
  originalRequirePermission,
  originalRequireAnyPermission
} = require('../middleware');

// Alias DB-only permission checkers for clarity
const requirePermission = originalRequirePermission;
const requireAnyPermission = originalRequireAnyPermission;

const router = express.Router();

// Note: authenticateUser is applied at mount level in router.js

// Helper routes for dropdowns (now protected by view permission)
router.get('/data/roles', requirePermission('view_user_management'), getRoles);
router.get('/data/evacuation-centers', requirePermission('view_user_management'), getEvacuationCenters);
router.get('/data/barangays', requirePermission('view_user_management'), getBarangays);
router.get('/data/disasters', requirePermission('view_user_management'), getDisasters);
router.get('/data/enums', requirePermission('view_user_management'), getEnumValues);

// Auth check route (public)
router.post('/check-login', checkUserCanLogin);

// Protected routes with enhanced permissions
router.get('/stats', 
  requirePermission('view_user_management'),
  getUserStats
);

router.get('/recent', 
  requirePermission('view_user_management'),
  filterUsersByRole(),
  getRecentUsers
);

router.get('/role/:roleId', 
  requirePermission('view_user_management'),
  filterUsersByRole(),
  getUsersByRole
);

router.get('/cswdo', 
  requirePermission('view_user_management'),
  getUsersWithRoleFourAndFive
);

// Main CRUD routes with permissions
router.post('/', 
  requirePermission('add_user'),
  createUser
);

router.get('/', 
  requirePermission('view_user_management'),
  filterUsersByRole(),
  getUsers
);

router.get('/:id', 
  requirePermission('view_user_management'),
  getUserById
);

router.put('/:id', 
  requirePermission('update_user'),
  updateUser
);

router.delete('/:id', 
  requirePermission('delete_user'),
  deleteUser
);

module.exports = router;
