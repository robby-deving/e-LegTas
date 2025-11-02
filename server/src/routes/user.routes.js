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

const { validateParams, validateQuery, validateBody } = require('../middleware/inputValidation');

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
router.post('/check-login', 
  validateBody({
    email: { validator: 'email', required: true }
  }),
  checkUserCanLogin
);

// Protected routes with enhanced permissions
router.get('/stats', 
  requirePermission('view_user_management'),
  getUserStats
);

router.get('/recent', 
  requirePermission('view_user_management'),
  validateQuery({
    limit: { validator: 'numeric', required: false, options: { min: 1, max: 100 } }
  }),
  getRecentUsers
);

router.get('/role/:roleId', 
  requirePermission('view_user_management'),
  validateParams({
    roleId: { validator: 'integer' }
  }),
  validateQuery({
    page: { validator: 'numeric', required: false, options: { min: 1 } },
    limit: { validator: 'numeric', required: false, options: { min: 1, max: 100 } },
    search: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  getUsersByRole
);

router.get('/cswdo', 
  requirePermission('view_user_management'),
  validateQuery({
    page: { validator: 'numeric', required: false, options: { min: 1 } },
    limit: { validator: 'numeric', required: false, options: { min: 1, max: 100 } },
    search: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  getUsersWithRoleFourAndFive
);

// Main CRUD routes with permissions
router.post('/', 
  requirePermission('add_user'),
  validateBody({
    firstName: { validator: 'string', required: true, options: { minLength: 1, maxLength: 100 } },
    lastName: { validator: 'string', required: true, options: { minLength: 1, maxLength: 100 } },
    middleName: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    suffix: { validator: 'string', required: false, options: { minLength: 1, maxLength: 20 } },
    sex: { validator: 'string', required: true, options: { minLength: 1, maxLength: 20 } },
    birthdate: { validator: 'string', required: true, options: { maxLength: 50, allowSpecialChars: true } },
    barangayOfOrigin: { validator: 'integer', required: false, options: { min: 1 } },
    employeeNumber: { validator: 'employeeNumber', required: false },
    email: { validator: 'email', required: true },
    password: { validator: 'password', required: true },
    roleId: { validator: 'integer', required: true, options: { min: 1 } },
    assignedEvacuationCenter: { validator: 'integer', required: false, options: { min: 1 } },
    assignedBarangay: { validator: 'integer', required: false, options: { min: 1 } }
  }),
  createUser
);

router.get('/', 
  requirePermission('view_user_management'),
  validateQuery({
    page: { validator: 'numeric', required: false, options: { min: 1 } },
    limit: { validator: 'numeric', required: false, options: { min: 1, max: 100 } },
    search: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } }
  }),
  getUsers
);

router.get('/:id', 
  requirePermission('view_user_management'),
  validateParams({
    id: { validator: 'integer' }
  }),
  getUserById
);

router.put('/:id', 
  requirePermission('update_user'),
  validateParams({
    id: { validator: 'integer' }
  }),
  validateBody({
    firstName: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    lastName: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    middleName: { validator: 'string', required: false, options: { minLength: 1, maxLength: 100 } },
    suffix: { validator: 'string', required: false, options: { minLength: 1, maxLength: 20 } },
    sex: { validator: 'string', required: false, options: { minLength: 1, maxLength: 20 } },
    birthdate: { validator: 'string', required: false, options: { maxLength: 50, allowSpecialChars: true } },
    barangayOfOrigin: { validator: 'integer', required: false, options: { min: 1 } },
    email: { validator: 'email', required: false },
    password: { validator: 'password', required: false },
    roleId: { validator: 'integer', required: false, options: { min: 1 } },
    assignedEvacuationCenter: { validator: 'integer', required: false, options: { min: 1 } },
    assignedBarangay: { validator: 'integer', required: false, options: { min: 1 } }
  }),
  updateUser
);

router.delete('/:id', 
  requirePermission('delete_user'),
  validateParams({
    id: { validator: 'integer' }
  }),
  deleteUser
);

module.exports = router;
