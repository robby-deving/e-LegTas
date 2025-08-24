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
  requirePermission,
  requireAnyPermission
} = require('../middleware');

const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

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
  getRecentUsers
);

router.get('/role/:roleId', 
  requirePermission('view_user_management'),
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
  getUsers
);

router.get('/:id', 
  requirePermission('view_user_management'),
  getUserById
);

// Middleware: require add_user_role only if roleId is being changed
const requireAddUserRoleIfChangingRole = async (req, res, next) => {
  try {
    const targetRoleIdRaw = req.body?.roleId;
    if (targetRoleIdRaw === undefined || targetRoleIdRaw === null || targetRoleIdRaw === '') {
      return next();
    }
    const targetRoleId = parseInt(targetRoleIdRaw);
    if (Number.isNaN(targetRoleId)) {
      return next();
    }
    const userId = req.params.id;
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        users_profile!user_profile_id(
          role_id
        )
      `)
      .eq('id', userId)
      .is('deleted_at', null)
      .single();
    if (error || !existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const currentRoleId = existingUser.users_profile?.role_id;
    if (currentRoleId === targetRoleId) {
      return next();
    }
    // Role is changing → require add_user_role
    return requirePermission('add_user_role')(req, res, next);
  } catch (err) {
    console.error('Role change check failed:', err);
    return res.status(500).json({ message: 'Role change validation failed', error: err.message });
  }
};

router.put('/:id', 
  requirePermission('update_user'),
  requireAddUserRoleIfChangingRole,
  updateUser
);

router.delete('/:id', 
  requirePermission('delete_user'),
  deleteUser
);

module.exports = router;
