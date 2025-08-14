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

// Import enhanced middleware
const { 
  authenticateUser,
  requireUserManagementAccess,
  filterUsersByRole,
  requireRoleGroup,
  originalRequirePermission
} = require('../middleware');

const router = express.Router();

// Apply authentication to protected routes
router.use('/stats', authenticateUser);
router.use('/recent', authenticateUser);
router.use('/role', authenticateUser);
router.use('/cswdo', authenticateUser);

// Apply auth to main CRUD routes (skip for public data endpoints)
router.use('/', (req, res, next) => {
  if (req.path.startsWith('/data/') || req.path === '/check-login') {
    return next();
  }
  return authenticateUser(req, res, next);
});

// Helper routes for dropdowns (public - no auth required)
router.get('/data/roles', getRoles);
router.get('/data/evacuation-centers', getEvacuationCenters);
router.get('/data/barangays', getBarangays);
router.get('/data/disasters', getDisasters);
router.get('/data/enums', getEnumValues);

// Auth check route (public)
router.post('/check-login', checkUserCanLogin);

// Protected routes with enhanced permissions
router.get('/stats', 
  requireRoleGroup(['SYSTEM_ADMIN_GROUP', 'CSWDO_GROUP']),
  requireUserManagementAccess('view'),
  getUserStats
);

router.get('/recent', 
  requireUserManagementAccess('view'),
  filterUsersByRole(),
  getRecentUsers
);

router.get('/role/:roleId', 
  requireUserManagementAccess('view'),
  filterUsersByRole(),
  getUsersByRole
);

router.get('/cswdo', 
  requireRoleGroup('CSWDO_GROUP'),
  requireUserManagementAccess('view'),
  getUsersWithRoleFourAndFive
);

// Main CRUD routes with permissions
router.post('/', 
  requireUserManagementAccess('add'),
  createUser
);

router.get('/', 
  requireUserManagementAccess('view'),
  filterUsersByRole(),
  getUsers
);

router.get('/:id', 
  requireUserManagementAccess('view'),
  getUserById
);

router.put('/:id', 
  requireUserManagementAccess('update'),
  updateUser
);

router.delete('/:id', 
  requireRoleGroup(['SYSTEM_ADMIN_GROUP', 'CSWDO_GROUP']),
  requireUserManagementAccess('delete'),
  deleteUser
);

module.exports = router;
